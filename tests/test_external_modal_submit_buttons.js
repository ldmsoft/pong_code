const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const handlers = fs.readFileSync(
    path.join(__dirname, '..', 'static/js/app.handlers.js'),
    'utf8'
);

test('固定底栏中的外部提交按钮可被任务和缺陷处理器识别', () => {
    assert.match(handlers, /function getSubmitButton\(event\)/);
    assert.match(handlers, /if \(event\.submitter\) return event\.submitter/);

    const updateIssue = handlers.slice(
        handlers.indexOf('async handlersUpdateIssue'),
        handlers.indexOf('async handlersSubmitWorkLog')
    );
    const updateBug = handlers.slice(
        handlers.indexOf('async handlersUpdateBug'),
        handlers.indexOf('async handlersSubmitBugWorkLog')
    );
    const submitEvidence = handlers.slice(
        handlers.indexOf('async handlersSubmitBugEvidence'),
        handlers.indexOf('async handlersDeleteIssue')
    );

    assert.match(updateIssue, /const btn = getSubmitButton\(e\)/);
    assert.match(updateBug, /const btn = getSubmitButton\(e\)/);
    assert.match(submitEvidence, /const btn = getSubmitButton\(e\)/);
});
