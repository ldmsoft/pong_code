"""对外外部开放的查询接口（OAuth2 client_credentials + JWT）。"""

import json
import os
import time
from datetime import timezone, timedelta
from functools import wraps

import jwt
from flask import Blueprint, current_app, g, jsonify, request

from extensions import db
from models import (
    Bug,
    Project,
    Sprint,
    User,
    Organization,
    organization_members,
    BUG_TYPE_LABELS,
    PRIORITY_LABELS,
    PLATFORM_LABELS,
    DISCOVERY_PHASE_LABELS,
    DISCOVERY_CHANNEL_LABELS,
)

bp = Blueprint('external_api', __name__)

# 数据库用 datetime.utcnow() 存储（naive UTC），对外返回时统一转东八区
CST = timezone(timedelta(hours=8))


def _to_cst_isoformat(dt):
    """UTC naive datetime → 东八区时间字符串 `YYYY-MM-DD HH:MM:SS`；None 原样返回。"""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(CST).strftime('%Y-%m-%d %H:%M:%S')


# ============== 配置 ==============

def _get_jwt_secret():
    return current_app.config.get('JWT_SECRET')


def _get_oauth_clients():
    """从 app.config['OAUTH_CLIENTS'] 加载（app.py 已从环境变量读取），格式：JSON 数组 [{client_id, client_secret}, ...]。"""
    raw = current_app.config.get('OAUTH_CLIENTS') or '[]'
    try:
        clients = json.loads(raw)
        return {c['client_id']: c['client_secret'] for c in clients}
    except (ValueError, KeyError, TypeError):
        current_app.logger.warning(f'[EXT] OAUTH_CLIENTS parse failed: {raw!r}')
        return {}


def _get_base_url():
    return current_app.config['APP_BASE_URL'].rstrip('/')


# ============== JWT 工具 ==============

TOKEN_TTL_SECONDS = 86400  # 1 天


def _issue_token(client_id):
    now = int(time.time())
    payload = {
        'client_id': client_id,
        'iat': now,
        'exp': now + TOKEN_TTL_SECONDS,
    }
    token = jwt.encode(payload, _get_jwt_secret(), algorithm='HS256')
    return token


def _decode_token(token):
    """成功返回 payload；失败返回 (None, error_kind)。"""
    try:
        return jwt.decode(token, _get_jwt_secret(), algorithms=['HS256']), None
    except jwt.ExpiredSignatureError:
        return None, 'expired'
    except jwt.InvalidTokenError:
        return None, 'invalid'


def require_external_token(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth = request.headers.get('Authorization', '')
        if not auth.startswith('Bearer '):
            return _error_response(401, 'invalid_token', 'Missing Bearer token')
        payload, err = _decode_token(auth[7:])
        if err is not None:
            desc = 'Token expired' if err == 'expired' else 'Invalid token'
            return _error_response(401, 'invalid_token', desc)
        g.client_id = payload.get('client_id')
        return f(*args, **kwargs)

    return wrapper


# ============== 工具 ==============

PAGE_SIZE_MAX = 100
PAGE_SIZE_DEFAULT = 20
PAGE_NUMBER_DEFAULT = 1


def _parse_pagination():
    data = request.args.to_dict(flat=True)
    try:
        page_size = int(data.get('pageSize', PAGE_SIZE_DEFAULT))
    except (TypeError, ValueError):
        page_size = PAGE_SIZE_DEFAULT
    try:
        page_number = int(data.get('pageNumber', PAGE_NUMBER_DEFAULT))
    except (TypeError, ValueError):
        page_number = PAGE_NUMBER_DEFAULT
    if page_size < 1:
        page_size = PAGE_SIZE_DEFAULT
    if page_number < 1:
        page_number = PAGE_NUMBER_DEFAULT
    if page_size > PAGE_SIZE_MAX:
        page_size = PAGE_SIZE_MAX
    return page_size, page_number, data


def _paginate(query, page_size, page_number):
    total = query.count()
    items = (
        query.offset((page_number - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return total, items


def _paged_response(page_size, page_number, total, data):
    return jsonify({
        'pageSize': page_size,
        'pageNumber': page_number,
        'total': total,
        'data': data,
    })


def _error_response(status, error, description):
    _audit_log(request.path, status)
    return jsonify({'error': error, 'error_description': description}), status


def _audit_log(endpoint, status_code, count=0):
    current_app.logger.info(
        '[EXT] client=%s endpoint=%s status=%s count=%s',
        getattr(g, 'client_id', '-'),
        endpoint,
        status_code,
        count,
    )


# ============== 序列化 ==============

SEVERITY_DESC = {
    1: 'S0-致命',
    2: 'S1-严重',
    3: 'S2-一般',
    4: 'S3-轻微',
    5: 'S4-建议',
}


def _enum_info(field_name, value, labels):
    """生成 {字段名: 英文枚举值, desc: 中文描述} 的嵌套对象；value 为空时返回 None。"""
    if value is None or value == '':
        return None
    return {
        field_name: value,
        'desc': labels.get(value, value),
    }


def _serialize_project(p):
    return {
        'id': p.id,
        'name': p.name,
        'description': p.description,
        'organizationInfo': {
            'id': p.organization.id if p.organization else None,
            'name': p.organization.name if p.organization else None,
        },
    }


def _serialize_sprint(s):
    return {
        'id': s.id,
        'name': s.name,
        'startDate': s.start_date.isoformat() if s.start_date else None,
        'endDate': s.end_date.isoformat() if s.end_date else None,
        'description': s.description,
        'goal': s.goal,
        'status': s.status,
        'url': f'{_get_base_url()}/#/projects/{s.project_id}/board?sprintId={s.id}',
        'projectInfo': {
            'id': s.project.id if s.project else None,
            'name': s.project.name if s.project else None,
        },
    }


def _user_info(user):
    if user is None:
        return {'id': None, 'username': None, 'email': None}
    return {'id': user.id, 'username': user.username, 'email': user.email}


def _serialize_bug(b):
    severity = b.severity if b.severity is not None else 3
    return {
        'id': b.id,
        'title': b.title,
        'description': b.description,
        'status': b.status,
        'createdAt': _to_cst_isoformat(b.created_at),
        'updatedAt': _to_cst_isoformat(b.updated_at),
        'resolvedAt': _to_cst_isoformat(b.resolved_at),
        'severityInfo': {
            'severity': severity,
            'desc': SEVERITY_DESC.get(severity, 'S2-一般'),
        },
        'bugTypeInfo': _enum_info('bugType', b.bug_type, BUG_TYPE_LABELS),
        'priorityInfo': _enum_info('priority', b.priority, PRIORITY_LABELS),
        'platformInfo': _enum_info('platform', b.platform, PLATFORM_LABELS),
        'discoveryPhaseInfo': _enum_info('discoveryPhase', b.discovery_phase, DISCOVERY_PHASE_LABELS),
        'discoveryChannelInfo': _enum_info('discoveryChannel', b.discovery_channel, DISCOVERY_CHANNEL_LABELS),
        'assigneeInfo': _user_info(b.assignee),
        'reporterInfo': _user_info(b.reporter),
        'sprintInfo': {
            'id': b.sprint.id if b.sprint else None,
            'name': b.sprint.name if b.sprint else None,
        },
    }


# ============== Token 端点 ==============

@bp.route('/oauth/token', methods=['GET'])
def oauth_token():
    client_id = request.args.get('client_id')
    client_secret = request.args.get('client_secret')
    grant_type = request.args.get('grant_type')

    clients = _get_oauth_clients()
    current_app.logger.info(
        '[OAUTH_DEBUG] args=%s client_id=%r client_secret=%r grant_type=%r configured_clients=%s',
        {k: v for k, v in request.args.items() if k != 'client_secret'},
        client_id,
        '<set>' if client_secret else None,
        grant_type,
        list(clients.keys()),
    )

    if grant_type != 'client_credentials':
        return _error_response(400, 'unsupported_grant_type', 'Only client_credentials is supported')

    if client_id not in clients or clients[client_id] != client_secret:
        return _error_response(401, 'invalid_client', 'Invalid client credentials')

    token = _issue_token(client_id)
    g.client_id = client_id
    _audit_log(request.path, 200)
    return jsonify({
        'access_token': token,
        'token_type': 'Bearer',
        'expires_in': TOKEN_TTL_SECONDS,
    })


# ============== 业务接口 ==============

@bp.route('/external/api/pjm/projects', methods=['GET'])
@require_external_token
def list_projects():
    page_size, page_number, data = _parse_pagination()
    query = Project.query

    organization_ids = data.get('organizationIds')
    if not organization_ids:
        return _paged_response(page_size, page_number, 0, [])
    try:
        id_list = [int(x.strip()) for x in organization_ids.split(',')]
        query = query.filter(Project.organization_id.in_(id_list))
    except ValueError:
        return _error_response(400, 'invalid_request', 'organizationIds must be comma-separated integers')

    query = query.order_by(Project.id.desc())
    total, items = _paginate(query, page_size, page_number)
    result = [_serialize_project(p) for p in items]
    _audit_log(request.path, 200, len(items))
    return _paged_response(page_size, page_number, total, result)


@bp.route('/external/api/pjm/projects/<int:project_id>/sprints', methods=['GET'])
@require_external_token
def list_sprints(project_id):
    project = Project.query.get(project_id)
    if project is None:
        return _error_response(404, 'not_found', 'Project not found')

    page_size, page_number, data = _parse_pagination()
    query = Sprint.query.filter_by(project_id=project_id)
    if data.get('name'):
        query = query.filter(Sprint.name.like(f'%{data["name"]}%'))
    if data.get('status'):
        query = query.filter(Sprint.status == data['status'])
    query = query.order_by(Sprint.id.desc())

    total, items = _paginate(query, page_size, page_number)
    result = [_serialize_sprint(s) for s in items]
    _audit_log(request.path, 200, len(items))
    return _paged_response(page_size, page_number, total, result)


@bp.route('/external/api/pjm/projects/<int:project_id>/sprints/<int:sprint_id>/bugs', methods=['GET'])
@require_external_token
def list_bugs(project_id, sprint_id):
    project = Project.query.get(project_id)
    if project is None:
        return _error_response(404, 'not_found', 'Project not found')
    sprint = Sprint.query.filter_by(id=sprint_id, project_id=project_id).first()
    if sprint is None:
        return _error_response(404, 'not_found', 'Sprint not found')

    page_size, page_number, data = _parse_pagination()
    query = Bug.query.filter_by(project_id=project_id, sprint_id=sprint_id)
    if data.get('title'):
        query = query.filter(Bug.title.like(f'%{data["title"]}%'))
    if data.get('status'):
        query = query.filter(Bug.status == data['status'])
    if data.get('bugType'):
        query = query.filter(Bug.bug_type == data['bugType'])
    if data.get('priority'):
        query = query.filter(Bug.priority == data['priority'])
    if data.get('platform'):
        query = query.filter(Bug.platform == data['platform'])
    if data.get('discoveryPhase'):
        query = query.filter(Bug.discovery_phase == data['discoveryPhase'])
    if data.get('discoveryChannel'):
        query = query.filter(Bug.discovery_channel == data['discoveryChannel'])
    query = query.order_by(Bug.id.desc())

    total, items = _paginate(query, page_size, page_number)
    result = [_serialize_bug(b) for b in items]
    _audit_log(request.path, 200, len(items))
    return _paged_response(page_size, page_number, total, result)


@bp.route('/external/api/pjm/users/organizations', methods=['GET'])
@require_external_token
def list_user_organizations():
    email = request.args.get('email')
    if not email:
        return _error_response(400, 'invalid_request', 'email is required')

    user = User.query.filter_by(email=email).first()
    if user is None:
        return _error_response(404, 'not_found', 'User not found')

    query = (
        db.session.query(Organization)
        .join(organization_members, organization_members.c.organization_id == Organization.id)
        .filter(organization_members.c.user_id == user.id)
        .order_by(Organization.id.desc())
    )
    items = query.all()
    result = [{'id': org.id, 'name': org.name} for org in items]
    _audit_log(request.path, 200, len(items))
    return jsonify({'total': len(result), 'data': result})
