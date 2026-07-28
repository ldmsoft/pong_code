const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const modalCore = fs.readFileSync(
    path.join(__dirname, '..', 'static/js/app.modals.core.js'),
    'utf8'
);
const indexHtml = fs.readFileSync(
    path.join(__dirname, '..', 'static/index.html'),
    'utf8'
);
const issueModal = fs.readFileSync(
    path.join(__dirname, '..', 'static/js/app.modals.issue.js'),
    'utf8'
);
const bugModal = fs.readFileSync(
    path.join(__dirname, '..', 'static/js/app.modals.bug.js'),
    'utf8'
);

test('缺陷编辑对话框底部操作按钮固定显示', () => {
    assert.match(
        bugModal,
        /footerHtml: `[\s\S]*?data-testid="edit-bug-fixed-footer"/
    );
    assert.match(bugModal, /edit-bug-fixed-footer[\s\S]*?取消[\s\S]*?保存更改/);
    assert.match(bugModal, /form="edit-bug-form-\$\{bugId\}"/);
    assert.match(bugModal, /<form id="edit-bug-form-\$\{bug\.id\}"/);
    assert.match(modalCore, /\$\{this\.modalOptions\.footerHtml \|\| ''\}/);
});

test('缺陷对话框只滚动中间内容，顶部标题栏保持固定', () => {
    assert.match(bugModal, /height:min\(90vh, 56rem\); max-height:90vh; overflow:hidden/);
    assert.match(bugModal, /frameStyle: 'height:100%; min-height:0; display:flex; flex-direction:column; overflow:hidden'/);
    assert.match(bugModal, /bodyStyle: 'flex:1 1 auto; min-height:0; overflow-y:auto'/);
    assert.match(modalCore, /style="\$\{this\.modalOptions\.bodyStyle \|\| ''\}"/);
    assert.match(indexHtml, /:style="modalOptions\.frameStyle \|\| ''"/);
});

test('缺陷详情和补充证据使用独立固定底栏', () => {
    assert.match(bugModal, /data-testid="view-bug-fixed-footer"/);
    assert.match(bugModal, /bugViewModalOptions\(\)/);
    assert.match(bugModal, /data-testid="bug-evidence-fixed-footer"/);
    assert.match(bugModal, /form="add-bug-evidence-form-\$\{bugId\}"/);
    assert.match(bugModal, /id="add-bug-evidence-form-\$\{bug\.id\}"/);
    assert.match(bugModal, /bugEvidenceModalOptions\(bug\.id\)/);
});

test('缺陷编辑与工时页签切换对应的固定底栏', () => {
    assert.match(bugModal, /id="bug-edit-details-footer"/);
    assert.match(bugModal, /id="bug-edit-time-footer"/);
    assert.match(bugModal, /bugEditModalOptions\(bug\.id, initialTab\)/);
});

test('任务编辑和工时页签使用独立固定底栏', () => {
    assert.match(issueModal, /data-testid="edit-issue-fixed-footer"/);
    assert.match(issueModal, /form="edit-issue-form-\$\{issue\.id\}"/);
    assert.match(issueModal, /id="edit-issue-form-\$\{i\.id\}"/);
    assert.match(issueModal, /id="issue-edit-details-footer"/);
    assert.match(issueModal, /id="issue-edit-time-footer"/);
    assert.match(issueModal, /taskEditModalOptions\(i, initialTab\)/);
    assert.match(issueModal, /bodyStyle: 'flex:1 1 auto; min-height:0; overflow-y:auto'/);
});
