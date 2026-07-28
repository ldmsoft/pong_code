import importlib
import os
import shutil
import tempfile
import unittest
from datetime import date
from uuid import uuid4


class RequirementBatchOperationsApiTestCase(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix='mini-agile-requirement-batch-')
        os.environ['DATABASE_URL'] = f"sqlite:///{os.path.join(self.temp_dir, 'test.db')}"
        os.environ['SECRET_KEY'] = 'test-secret'

        app_module = importlib.import_module('app')
        self.app_module = importlib.reload(app_module)
        self.app = self.app_module.create_app()
        self.app.config.update(TESTING=True, WTF_CSRF_ENABLED=False)
        self.context = self.app.app_context()
        self.context.push()
        self.client = self.app.test_client()
        self.owner_id = self._register_and_login()

        org = self.client.post('/api/organizations', json={'name': f'Org-{uuid4().hex[:8]}'}).get_json()
        team = self.client.post(
            f"/api/organizations/{org['id']}/teams",
            json={'name': 'Requirement team'},
        ).get_json()
        project = self.client.post(
            f"/api/organizations/{org['id']}/projects",
            json={'name': 'Requirement project', 'team_id': team['id']},
        ).get_json()
        self.project_id = project['id']

    def tearDown(self):
        self.app_module.db.session.remove()
        self.context.pop()
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def _register_and_login(self):
        username = f'owner_{uuid4().hex[:8]}'
        self.client.post('/api/auth/register', json={
            'username': username,
            'email': f'{username}@example.com',
            'password': 'password123',
        })
        response = self.client.post('/api/auth/login', json={
            'username': username,
            'password': 'password123',
        })
        return response.get_json()['user']['id']

    def _seed_requirements(self):
        models = importlib.import_module('models')
        db = self.app_module.db
        sprint = models.Sprint(name='Target sprint', project_id=self.project_id)
        requirements = [
            models.Requirement(
                title=f'Requirement {index}',
                content='content',
                project_id=self.project_id,
                creator_id=self.owner_id,
            )
            for index in range(3)
        ]
        db.session.add_all([sprint, *requirements])
        db.session.commit()
        return sprint, requirements

    def test_batch_bind_adds_selected_requirements_without_unbinding_existing_one(self):
        sprint, requirements = self._seed_requirements()
        requirements[0].sprint_id = sprint.id
        self.app_module.db.session.commit()

        response = self.client.post(
            f'/api/projects/{self.project_id}/requirements/batch-bind-sprint',
            json={'requirement_ids': [requirements[1].id, requirements[2].id], 'sprint_id': sprint.id},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['updated_count'], 2)
        for requirement in requirements:
            self.app_module.db.session.refresh(requirement)
            self.assertEqual(requirement.sprint_id, sprint.id)

    def test_batch_delete_removes_tasks_and_worklogs_and_keeps_bug(self):
        models = importlib.import_module('models')
        _, requirements = self._seed_requirements()
        issue = models.Issue(
            title='Requirement task',
            project_id=self.project_id,
            requirement_id=requirements[0].id,
        )
        bug = models.Bug(
            title='Related bug',
            description='description',
            project_id=self.project_id,
            reporter_id=self.owner_id,
            requirement_id=requirements[0].id,
        )
        self.app_module.db.session.add_all([issue, bug])
        self.app_module.db.session.flush()
        self.app_module.db.session.add(models.WorkLog(
            issue_id=issue.id,
            user_id=self.owner_id,
            hours=1,
            date=date.today(),
        ))
        self.app_module.db.session.commit()

        response = self.client.post(
            f'/api/projects/{self.project_id}/requirements/batch-delete',
            json={'requirement_ids': [requirements[0].id, requirements[1].id]},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['deleted_count'], 2)
        self.assertEqual(response.get_json()['deleted_issue_count'], 1)
        self.assertEqual(models.Requirement.query.count(), 1)
        self.assertEqual(models.Issue.query.count(), 0)
        self.assertEqual(models.WorkLog.query.count(), 0)
        self.assertIsNone(models.Bug.query.get(bug.id).requirement_id)

    def test_batch_operations_reject_unknown_requirement_ids(self):
        sprint, requirements = self._seed_requirements()

        bind_response = self.client.post(
            f'/api/projects/{self.project_id}/requirements/batch-bind-sprint',
            json={'requirement_ids': [requirements[0].id, 999999], 'sprint_id': sprint.id},
        )
        delete_response = self.client.post(
            f'/api/projects/{self.project_id}/requirements/batch-delete',
            json={'requirement_ids': [requirements[0].id, 999999]},
        )

        self.assertEqual(bind_response.status_code, 400)
        self.assertEqual(delete_response.status_code, 400)
        self.assertEqual(importlib.import_module('models').Requirement.query.count(), 3)

    def test_replace_sprint_requirements_rejects_occupied_requirement_atomically(self):
        models = importlib.import_module('models')
        sprint, requirements = self._seed_requirements()
        other_sprint = models.Sprint(name='Other sprint', project_id=self.project_id)
        self.app_module.db.session.add(other_sprint)
        self.app_module.db.session.flush()
        requirements[0].sprint_id = sprint.id
        requirements[1].sprint_id = other_sprint.id
        self.app_module.db.session.commit()

        response = self.client.put(
            f'/api/sprints/{sprint.id}/requirements',
            json={'requirement_ids': [requirements[0].id, requirements[1].id]},
        )

        self.assertEqual(response.status_code, 409)
        self.assertIn('其他迭代', response.get_json()['error'])
        for requirement in requirements:
            self.app_module.db.session.refresh(requirement)
        self.assertEqual(requirements[0].sprint_id, sprint.id)
        self.assertEqual(requirements[1].sprint_id, other_sprint.id)
        self.assertIsNone(requirements[2].sprint_id)

    def test_replace_sprint_requirements_unbinds_old_and_preserves_other_sprint(self):
        models = importlib.import_module('models')
        sprint, requirements = self._seed_requirements()
        other_sprint = models.Sprint(name='Other sprint', project_id=self.project_id)
        self.app_module.db.session.add(other_sprint)
        self.app_module.db.session.flush()
        requirements[0].sprint_id = sprint.id
        requirements[1].sprint_id = other_sprint.id
        self.app_module.db.session.commit()

        response = self.client.put(
            f'/api/sprints/{sprint.id}/requirements',
            json={'requirement_ids': [requirements[2].id]},
        )

        self.assertEqual(response.status_code, 200)
        for requirement in requirements:
            self.app_module.db.session.refresh(requirement)
        self.assertIsNone(requirements[0].sprint_id)
        self.assertEqual(requirements[1].sprint_id, other_sprint.id)
        self.assertEqual(requirements[2].sprint_id, sprint.id)

    def test_confirmed_unbind_deletes_current_sprint_tasks_and_worklogs(self):
        models = importlib.import_module('models')
        sprint, requirements = self._seed_requirements()
        requirements[0].sprint_id = sprint.id
        removed_issue = models.Issue(
            title='Removed requirement task',
            project_id=self.project_id,
            sprint_id=sprint.id,
            requirement_id=requirements[0].id,
        )
        preserved_issue = models.Issue(
            title='Preserved task',
            project_id=self.project_id,
            sprint_id=sprint.id,
            requirement_id=requirements[1].id,
        )
        self.app_module.db.session.add_all([removed_issue, preserved_issue])
        self.app_module.db.session.flush()
        self.app_module.db.session.add(models.WorkLog(
            issue_id=removed_issue.id,
            user_id=self.owner_id,
            hours=1,
            date=date.today(),
        ))
        self.app_module.db.session.commit()
        removed_issue_id = removed_issue.id
        preserved_issue_id = preserved_issue.id

        response = self.client.put(
            f'/api/sprints/{sprint.id}/requirements',
            json={
                'requirement_ids': [],
                'delete_unbound_tasks': True,
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['deleted_issue_count'], 1)
        self.assertIsNone(self.app_module.db.session.get(models.Issue, removed_issue_id))
        self.assertIsNotNone(self.app_module.db.session.get(models.Issue, preserved_issue_id))
        self.assertEqual(models.WorkLog.query.count(), 0)

    def test_replace_sprint_requirements_rejects_cross_project_requirement(self):
        models = importlib.import_module('models')
        sprint, requirements = self._seed_requirements()
        source_project = self.app_module.db.session.get(models.Project, self.project_id)
        other_project = models.Project(
            name='Other project',
            organization_id=source_project.organization_id,
            team_id=source_project.team_id,
        )
        self.app_module.db.session.add(other_project)
        self.app_module.db.session.flush()
        cross_project_requirement = models.Requirement(
            title='Cross-project requirement',
            content='content',
            project_id=other_project.id,
            creator_id=self.owner_id,
        )
        requirements[0].sprint_id = sprint.id
        self.app_module.db.session.add(cross_project_requirement)
        self.app_module.db.session.commit()

        response = self.client.put(
            f'/api/sprints/{sprint.id}/requirements',
            json={'requirement_ids': [cross_project_requirement.id]},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('不属于当前项目', response.get_json()['error'])
        self.app_module.db.session.refresh(requirements[0])
        self.app_module.db.session.refresh(cross_project_requirement)
        self.assertEqual(requirements[0].sprint_id, sprint.id)
        self.assertIsNone(cross_project_requirement.sprint_id)


if __name__ == '__main__':
    unittest.main()
