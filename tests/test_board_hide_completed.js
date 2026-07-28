const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const board = fs.readFileSync(
    path.join(__dirname, '..', 'static/js/app.views.board.js'),
    'utf8'
);
const sprintModal = fs.readFileSync(
    path.join(__dirname, '..', 'static/js/app.modals.sprint.js'),
    'utf8'
);
const handlers = fs.readFileSync(
    path.join(__dirname, '..', 'static/js/app.handlers.js'),
    'utf8'
);

test('board remembers the hide-completed preference globally', () => {
    assert.match(board, /BOARD_HIDE_COMPLETED_STORAGE_KEY = 'pongcode:board:hide-completed'/);
    assert.match(board, /localStorage\.getItem\(BOARD_HIDE_COMPLETED_STORAGE_KEY\) === 'true'/);
    assert.match(board, /localStorage\.setItem\(BOARD_HIDE_COMPLETED_STORAGE_KEY, enabled \? 'true' : 'false'\)/);
    assert.match(board, /data-testid="board-hide-completed-toggle"/);
    assert.match(board, /role="switch" aria-checked="\$\{hideCompletedCards\}"/);
    assert.match(board, /data-testid="board-hide-completed-toggle"[\s\S]*style="height: 38px;"/);
    assert.match(board, /transform: translateX\(\$\{hideCompletedCards \? '16px' : '0'\}\)/);
});

test('completed cards are filtered only when the board renders', () => {
    assert.match(board, /hideCompletedCards && swimlane\.done\.length > 0/);
    assert.match(board, /已隐藏 \$\{swimlane\.done\.length\} 项/);
    assert.match(board, /this\.navigate\('board', \{ id: projectId, sprintId \}\)/);
    assert.doesNotMatch(board, /onEnd:[\s\S]*hideCompletedCards[\s\S]*evt\.item\.remove/);
});

test('bind-requirements action is immediately after the hide-completed control', () => {
    const hideToggleIndex = board.indexOf('data-testid="board-hide-completed-toggle"');
    const bindButtonIndex = board.indexOf('data-testid="board-bind-requirements-button"');
    const refreshButtonIndex = board.indexOf("app.navigate('board'");

    assert.ok(hideToggleIndex >= 0);
    assert.ok(bindButtonIndex > hideToggleIndex);
    assert.ok(refreshButtonIndex > bindButtonIndex);
    assert.match(board, /bindBoardRequirements\(\$\{id\}, \$\{sprintId\}\)/);
});

test('bind-requirements modal supports filtering and protects occupied requirements', () => {
    assert.match(sprintModal, /data-testid="board-bind-requirements-search"/);
    assert.match(sprintModal, /data-testid="board-bind-requirements-list"/);
    assert.match(sprintModal, /data-testid="board-bind-requirements-footer"/);
    assert.match(sprintModal, /requirement\.sprint_id === sprintId/);
    assert.match(sprintModal, /Boolean\(requirement\.sprint_id\) && !isCurrent/);
    assert.match(sprintModal, /已被“\$\{sprintName\}”绑定/);
    assert.match(sprintModal, /\$\{isOccupied \? 'disabled' : ''\}/);
    assert.match(sprintModal, /filterBoardRequirementBindings/);
    assert.match(sprintModal, /overflow-y-auto p-6/);
});

test('saving board requirement bindings refreshes the same sprint board', () => {
    assert.match(handlers, /handlersUpdateBoardSprintRequirements\(e, projectId, sprintId\)/);
    assert.match(sprintModal, /data-originally-bound="\$\{isCurrent\}"/);
    assert.match(handlers, /data-originally-bound="true"/);
    assert.match(handlers, /取消绑定后，对应的 \$\{removedBoundRequirements\.length\} 个需求下属于当前迭代的任务及工时将被删除/);
    assert.match(handlers, /delete_unbound_tasks: removedBoundRequirements\.length > 0/);
    assert.match(handlers, /`\/sprints\/\$\{sprintId\}\/requirements`/);
    assert.match(handlers, /this\.navigate\('board', \{ id: projectId, sprintId \}\)/);
});
