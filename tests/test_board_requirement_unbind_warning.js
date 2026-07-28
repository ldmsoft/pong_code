const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

class MockFormData {
    constructor(form) {
        this.form = form;
    }

    getAll(name) {
        return this.form.fields
            .filter(([fieldName]) => fieldName === name)
            .map(([, value]) => value);
    }
}

function loadHandlers(confirmImpl) {
    const context = {
        alert() {},
        confirm: confirmImpl,
        console,
        FormData: MockFormData,
        window: { MiniAgile: {} },
    };
    const code = fs.readFileSync(
        path.join(__dirname, '..', 'static/js/app.handlers.js'),
        'utf8'
    );
    vm.runInNewContext(code, context, { filename: 'static/js/app.handlers.js' });
    return context.window.MiniAgile.handlers;
}

function makeEvent(removedBoundRequirements) {
    const submitter = { disabled: false, innerHTML: '保存绑定' };
    const form = {
        fields: [['requirement_ids', '2']],
        querySelectorAll(selector) {
            assert.equal(
                selector,
                'input[name="requirement_ids"][data-originally-bound="true"]'
            );
            return removedBoundRequirements;
        },
    };
    return {
        event: {
            preventDefault() {},
            submitter,
            target: form,
        },
        submitter,
    };
}

test('取消解绑确认时不提交需求绑定变更', async () => {
    const confirmations = [];
    const handlers = loadHandlers((message) => {
        confirmations.push(message);
        return false;
    });
    const apiCalls = [];
    const app = {
        async api(...args) {
            apiCalls.push(args);
            return {};
        },
    };
    const { event, submitter } = makeEvent([{ checked: false }]);

    await handlers.handlersUpdateBoardSprintRequirements.call(app, event, 1, 3);

    assert.equal(confirmations.length, 1);
    assert.match(confirmations[0], /任务及工时将被删除/);
    assert.equal(apiCalls.length, 0);
    assert.equal(submitter.disabled, false);
    assert.equal(submitter.innerHTML, '保存绑定');
});

test('确认解绑后提交删除任务标记并刷新当前看板', async () => {
    const handlers = loadHandlers(() => true);
    const apiCalls = [];
    const navigations = [];
    let modalClosed = false;
    const app = {
        async api(...args) {
            apiCalls.push(args);
            return { requirements: [], deleted_issue_count: 1 };
        },
        modals: { close() { modalClosed = true; } },
        navigate(...args) { navigations.push(args); },
        showToast() {},
    };
    const { event } = makeEvent([{ checked: false }]);

    await handlers.handlersUpdateBoardSprintRequirements.call(app, event, 1, 3);

    assert.equal(apiCalls.length, 1);
    assert.equal(apiCalls[0][0], '/sprints/3/requirements');
    assert.equal(apiCalls[0][1], 'PUT');
    assert.equal(apiCalls[0][2].delete_unbound_tasks, true);
    assert.deepEqual(Array.from(apiCalls[0][2].requirement_ids), [2]);
    assert.equal(modalClosed, true);
    assert.equal(navigations[0][0], 'board');
    assert.equal(navigations[0][1].sprintId, 3);
});
