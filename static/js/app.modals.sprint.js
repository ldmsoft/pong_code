(function () {
    const MiniAgile = window.MiniAgile = window.MiniAgile || {};
    MiniAgile.modals = MiniAgile.modals || {};

        // 需求搜索过滤函数
        window.filterReqs = function(keyword, listId) {
            const list = document.getElementById(listId);
            if (!list) return;
            const items = list.querySelectorAll('.req-item');
            const lowerKeyword = keyword.toLowerCase().trim();
            
            items.forEach(item => {
                const title = item.getAttribute('data-title') || '';
                if (!lowerKeyword || title.includes(lowerKeyword)) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
        };

        // 更新已选需求数量
        window.updateReqCount = function() {
            // 创建迭代模态框
            const createCount = document.getElementById('create-req-count');
            if (createCount) {
                const checked = document.querySelectorAll('#create-req-list input[name="requirement_ids"]:checked').length;
                createCount.textContent = `已选 ${checked} 个`;
            }
            // 编辑迭代模态框
            const editCount = document.getElementById('edit-req-count');
            if (editCount) {
                const checked = document.querySelectorAll('#edit-req-list input[name="requirement_ids"]:checked').length;
                editCount.textContent = `已选 ${checked} 个`;
            }
        };

        window.filterBoardRequirementBindings = function(keyword) {
            const normalized = String(keyword || '').toLowerCase().trim();
            document.querySelectorAll('[data-board-requirement-item]').forEach((item) => {
                const searchable = item.getAttribute('data-search') || '';
                item.style.display = !normalized || searchable.includes(normalized) ? '' : 'none';
            });
        };

        window.updateBoardRequirementBindingCount = function() {
            const count = document.querySelectorAll(
                '#board-bind-requirements-list input[name="requirement_ids"]:checked'
            ).length;
            const countLabel = document.getElementById('board-bind-requirements-count');
            if (countLabel) countLabel.textContent = `已选 ${count} 个`;
        };

        MiniAgile.modals.modalCreateSprint = async function(projectId) {
            const [users, reqData] = await Promise.all([
                this.api('/users/search'),
                this.api(`/projects/${projectId}/requirements`)
            ]);
            const userOptions = users ? users.map(u => `<option value="${u.id}" ${this.user && String(this.user.id) === String(u.id) ? 'selected' : ''}>${u.username}</option>`).join('') : '';
            
            // 获取未关联迭代的需求（API直接返回数组）
            const availableReqs = (Array.isArray(reqData) ? reqData : []).filter(r => !r.sprint_id);
            const reqCheckboxes = availableReqs.length > 0 ? availableReqs.map(r => `
                <label class="req-item flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-purple-300 cursor-pointer transition-colors" data-title="${r.title.toLowerCase()}" data-priority="${r.priority}">
                    <input type="checkbox" name="requirement_ids" value="${r.id}" class="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500" onchange="window.updateReqCount && window.updateReqCount()">
                    <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium text-gray-900 truncate">${r.title}</div>
                        <div class="text-xs text-gray-500">优先级: P${r.priority}</div>
                    </div>
                </label>
            `).join('') : '';

            this.modalShow(`
                <div class="mb-6">
                    <h3 class="text-2xl font-bold text-gray-900 mb-2">启动迭代</h3>
                    <p class="text-gray-500 text-sm">创建新的迭代以组织团队的工作</p>
                </div>
                <form onsubmit="app.handlers.submitSprint(event, ${projectId})" class="space-y-5">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="col-span-2">
                            <label class="block text-sm font-semibold text-gray-700 mb-2">
                                迭代名称 <span class="text-red-500">*</span>
                            </label>
                            <input name="name" data-testid="create-sprint-name-input" class="block w-full rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-0 py-2.5 px-4 text-sm placeholder-gray-400 transition-all" placeholder="例如：Sprint 10" required>
                        </div>
                        <div class="col-span-2 md:col-span-1">
                            <label class="block text-sm font-semibold text-gray-700 mb-2">
                                类别
                            </label>
                            <select name="category" class="block w-full rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-0 py-2.5 px-4 text-sm bg-white transition-all">
                                <option value="Product">产品迭代</option>
                                <option value="Tech">技术债务</option>
                                <option value="Bugfix">错误修复</option>
                                <option value="Release">发布准备</option>
                            </select>
                        </div>
                        <div class="col-span-2 md:col-span-1">
                            <label class="block text-sm font-semibold text-gray-700 mb-2">
                                负责人 <span class="text-red-500">*</span>
                            </label>
                            <select name="owner_id" class="block w-full rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-0 py-2.5 px-4 text-sm bg-white transition-all" required>
                                ${userOptions}
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">
                                开始日期 <span class="text-red-500">*</span>
                            </label>
                            <input name="start_date" data-testid="create-sprint-start-date-input" type="date" class="block w-full rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-0 py-2.5 px-4 text-sm transition-all" required>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">
                                结束日期 <span class="text-red-500">*</span>
                            </label>
                            <input name="end_date" data-testid="create-sprint-end-date-input" type="date" class="block w-full rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-0 py-2.5 px-4 text-sm transition-all" required>
                        </div>
                    </div>

                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <label class="block text-sm font-semibold text-gray-700">
                                关联需求（泳道）
                            </label>
                            <span id="create-req-count" class="text-xs text-purple-600 font-medium">已选 0 个</span>
                        </div>
                        ${availableReqs.length > 0 ? `
                        <div class="relative mb-2">
                            <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                            <input type="text" id="create-req-search" placeholder="搜索需求..." class="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500" oninput="window.filterReqs && window.filterReqs(this.value, 'create-req-list')">
                        </div>
                        <div id="create-req-list" class="max-h-40 overflow-y-auto space-y-2 p-2 bg-gray-50 rounded-xl border border-gray-200">
                            ${reqCheckboxes}
                        </div>
                        <p class="text-xs text-gray-500 mt-1">输入关键字搜索需求，选择要纳入此迭代的需求</p>
                        ` : '<div class="p-4 bg-gray-50 rounded-xl border border-gray-200 text-gray-400 text-sm text-center italic">暂无可用需求</div>'}
                    </div>

                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">
                            描述
                        </label>
                        <textarea name="description" rows="2" class="block w-full rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-0 py-2.5 px-4 text-sm placeholder-gray-400 transition-all resize-none" placeholder="简要描述本次迭代..."></textarea>
                    </div>

                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">
                            迭代目标
                        </label>
                        <textarea name="goal" rows="2" class="block w-full rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-0 py-2.5 px-4 text-sm placeholder-gray-400 transition-all resize-none" placeholder="主要目标是什么？"></textarea>
                    </div>

                    <div class="bg-purple-50 border border-purple-200 rounded-xl p-4">
                        <div class="flex items-start gap-3">
                            <i class="fa-solid fa-info-circle text-purple-600 mt-0.5"></i>
                            <div>
                                <p class="text-sm font-semibold text-purple-900 mb-1">迭代规划提示</p>
                                <p class="text-xs text-purple-700">典型的迭代周期为1-2周。请选择与团队工作流程一致的日期。</p>
                            </div>
                        </div>
                    </div>
                    <div class="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button type="button" onclick="app.modals.close()" class="px-5 py-2.5 text-gray-700 hover:text-gray-900 text-sm font-semibold hover:bg-gray-100 rounded-lg transition-colors">取消</button>
                        <button type="submit" data-testid="create-sprint-submit-button" class="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow-lg shadow-purple-500/30 transition-all hover:scale-105">
                            <i class="fa-solid fa-rocket mr-2"></i>启动迭代
                        </button>
                    </div>
                </form>
            `);
        };

        MiniAgile.modals.modalEditSprint = async function(sprintId) {
            const data = await this.api(`/sprints/${sprintId}`);
            if (!data || data.error) {
                alert('加载迭代详情失败');
                return;
            }

            const sprint = data.sprint;
            const logs = data.work_logs || [];
            const [users, reqData] = await Promise.all([
                this.api('/users/search'),
                this.api(`/projects/${sprint.project_id}/requirements`)
            ]);
            const userOptions = users ? users.map(u => `<option value="${u.id}" ${String(sprint.owner_id) === String(u.id) ? 'selected' : ''}>${u.username}</option>`).join('') : '';
            
            // 获取可用的需求（未关联迭代的 + 当前迭代已关联的，API直接返回数组）
            const allReqs = Array.isArray(reqData) ? reqData : [];
            const availableReqs = allReqs.filter(r => !r.sprint_id || r.sprint_id === sprintId);
            const checkedCount = availableReqs.filter(r => r.sprint_id === sprintId).length;
            const editReqCheckboxes = availableReqs.length > 0 ? availableReqs.map(r => `
                <label class="req-item flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-purple-300 cursor-pointer transition-colors" data-title="${r.title.toLowerCase()}" data-priority="${r.priority}">
                    <input type="checkbox" name="requirement_ids" value="${r.id}" ${r.sprint_id === sprintId ? 'checked' : ''} class="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500" onchange="window.updateReqCount && window.updateReqCount()">
                    <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium text-gray-900 truncate">${r.title}</div>
                        <div class="text-xs text-gray-500">优先级: P${r.priority}</div>
                    </div>
                </label>
            `).join('') : '';

            this.modalShow(`
                <div class="mb-4">
                    <h3 class="text-2xl font-bold text-gray-900 mb-1">编辑迭代</h3>
                    <p class="text-xs text-gray-500 uppercase tracking-wider font-bold">ID: #${sprint.id}</p>
                </div>

                <!-- Tabs -->
                <div class="flex border-b border-gray-200 mb-6" id="edit-sprint-tabs">
                    <button onclick="document.getElementById('tab-sprint-details').classList.remove('hidden'); document.getElementById('tab-sprint-time').classList.add('hidden'); document.getElementById('tab-sprint-reqs').classList.add('hidden'); document.querySelectorAll('#edit-sprint-tabs button').forEach(b => { b.classList.remove('border-purple-500', 'text-purple-600'); b.classList.add('text-gray-500', 'border-transparent'); }); this.classList.add('border-purple-500', 'text-purple-600'); this.classList.remove('text-gray-500', 'border-transparent');" class="px-4 py-2 text-sm font-medium text-purple-600 border-b-2 border-purple-500 focus:outline-none transition-colors">详情</button>
                    <button onclick="document.getElementById('tab-sprint-reqs').classList.remove('hidden'); document.getElementById('tab-sprint-details').classList.add('hidden'); document.getElementById('tab-sprint-time').classList.add('hidden'); document.querySelectorAll('#edit-sprint-tabs button').forEach(b => { b.classList.remove('border-purple-500', 'text-purple-600'); b.classList.add('text-gray-500', 'border-transparent'); }); this.classList.add('border-purple-500', 'text-purple-600'); this.classList.remove('text-gray-500', 'border-transparent');" class="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent focus:outline-none transition-colors">需求</button>
                    <button onclick="document.getElementById('tab-sprint-time').classList.remove('hidden'); document.getElementById('tab-sprint-details').classList.add('hidden'); document.getElementById('tab-sprint-reqs').classList.add('hidden'); document.querySelectorAll('#edit-sprint-tabs button').forEach(b => { b.classList.remove('border-purple-500', 'text-purple-600'); b.classList.add('text-gray-500', 'border-transparent'); }); this.classList.add('border-purple-500', 'text-purple-600'); this.classList.remove('text-gray-500', 'border-transparent');" class="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent focus:outline-none transition-colors">工时</button>
                </div>

                <!-- Details Tab -->
                <div id="tab-sprint-details">
                    <form onsubmit="app.handlers.updateSprint(event, ${sprint.id})" class="space-y-5">
                        <div class="grid grid-cols-2 gap-4">
                            <div class="col-span-2">
                                <label class="block text-sm font-semibold text-gray-700 mb-2">
                                    迭代名称 <span class="text-red-500">*</span>
                                </label>
                                <input name="name" value="${sprint.name}" class="block w-full rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-0 py-2.5 px-4 text-sm" required>
                            </div>
                            <div class="col-span-2 md:col-span-1">
                                <label class="block text-sm font-semibold text-gray-700 mb-2">
                                    类别
                                </label>
                                <select name="category" class="block w-full rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-0 py-2.5 px-4 text-sm bg-white">
                                    <option value="Product" ${sprint.category === 'Product' ? 'selected' : ''}>产品迭代</option>
                                    <option value="Tech" ${sprint.category === 'Tech' ? 'selected' : ''}>技术债务</option>
                                    <option value="Bugfix" ${sprint.category === 'Bugfix' ? 'selected' : ''}>错误修复</option>
                                    <option value="Release" ${sprint.category === 'Release' ? 'selected' : ''}>发布准备</option>
                                </select>
                            </div>
                            <div class="col-span-2 md:col-span-1">
                                <label class="block text-sm font-semibold text-gray-700 mb-2">
                                    负责人
                                </label>
                                <select name="owner_id" class="block w-full rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-0 py-2.5 px-4 text-sm bg-white">
                                    <option value="">未分配</option>
                                    ${userOptions}
                                </select>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">
                                    开始日期
                                </label>
                                <input name="start_date" type="date" value="${sprint.start_date || ''}" class="block w-full rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-0 py-2.5 px-4 text-sm">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">
                                    结束日期
                                </label>
                                <input name="end_date" type="date" value="${sprint.end_date || ''}" class="block w-full rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-0 py-2.5 px-4 text-sm">
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">
                                    状态
                                </label>
                                <select name="status" class="block w-full rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-0 py-2.5 px-4 text-sm bg-white">
                                    <option value="open" ${sprint.status === 'open' ? 'selected' : ''}>未开始</option>
                                    <option value="active" ${sprint.status === 'active' ? 'selected' : ''}>进行中</option>
                                    <option value="closed" ${sprint.status === 'closed' ? 'selected' : ''}>已完成</option>
                                </select>
                            </div>
                            <div></div>
                        </div>

                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">
                                描述
                            </label>
                            <textarea name="description" rows="2" class="block w-full rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-0 py-2.5 px-4 text-sm resize-none">${sprint.description || ''}</textarea>
                        </div>

                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">
                                迭代目标
                            </label>
                            <textarea name="goal" rows="2" class="block w-full rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-0 py-2.5 px-4 text-sm resize-none">${sprint.goal || ''}</textarea>
                        </div>

                        <div class="flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
                            ${data.can_delete ? `
                                <button type="button" data-testid="delete-sprint-button" onclick='app.handlers.deleteSprint(${sprint.id}, ${sprint.project_id}, ${JSON.stringify(sprint.name).replace(/'/g, "\\u0027")})' class="px-4 py-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 text-sm font-semibold rounded-lg transition-colors">
                                    <i class="fa-solid fa-trash mr-2"></i>删除迭代
                                </button>
                            ` : '<span></span>'}
                            <div class="flex justify-end gap-3">
                                <button type="button" onclick="app.modals.close()" class="px-5 py-2.5 text-gray-700 hover:text-gray-900 text-sm font-semibold hover:bg-gray-100 rounded-lg transition-colors">取消</button>
                                <button type="submit" class="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow-lg shadow-purple-500/30 transition-all hover:scale-105">
                                    <i class="fa-solid fa-save mr-2"></i>保存更改
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                <!-- Requirements Tab -->
                <div id="tab-sprint-reqs" class="hidden">
                    <form onsubmit="app.handlers.updateSprintRequirements(event, ${sprint.id})" class="space-y-5">
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <label class="block text-sm font-semibold text-gray-700">
                                    关联需求（泳道）
                                </label>
                                <span id="edit-req-count" class="text-xs text-purple-600 font-medium">已选 ${checkedCount} 个</span>
                            </div>
                            ${availableReqs.length > 0 ? `
                            <div class="relative mb-2">
                                <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                                <input type="text" id="edit-req-search" placeholder="搜索需求..." class="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500" oninput="window.filterReqs && window.filterReqs(this.value, 'edit-req-list')">
                            </div>
                            <div id="edit-req-list" class="max-h-64 overflow-y-auto space-y-2 p-2 bg-gray-50 rounded-xl border border-gray-200">
                                ${editReqCheckboxes}
                            </div>
                            <p class="text-xs text-gray-500 mt-2">输入关键字搜索需求，选择要纳入此迭代的需求</p>
                            ` : '<div class="p-4 bg-gray-50 rounded-xl border border-gray-200 text-gray-400 text-sm text-center italic">暂无可用需求</div>'}
                        </div>

                        <div class="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <button type="button" onclick="app.modals.close()" class="px-5 py-2.5 text-gray-700 hover:text-gray-900 text-sm font-semibold hover:bg-gray-100 rounded-lg transition-colors">取消</button>
                            <button type="submit" class="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow-lg shadow-purple-500/30 transition-all hover:scale-105">
                                <i class="fa-solid fa-save mr-2"></i>保存需求
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Time Tracking Tab -->
                <div id="tab-sprint-time" class="hidden">
                    <div class="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
                        <h4 class="text-sm font-bold text-gray-900 mb-3">登记工时</h4>
                        <form onsubmit="app.handlers.submitSprintWorkLog(event, ${sprint.id})" class="flex flex-col gap-3">
                            <div class="grid grid-cols-2 gap-3">
                                <input type="date" name="date" required value="${new Date().toISOString().split('T')[0]}" class="block w-full rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-0 py-2.5 px-4 text-sm">
                                <input type="number" name="hours" step="0.25" min="0.25" placeholder="工时（例如 1.5）" required class="block w-full rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-0 py-2.5 px-4 text-sm">
                            </div>
                            <textarea name="description" rows="3" placeholder="工作说明（可选）" class="block w-full rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-0 py-2.5 px-4 text-sm resize-none"></textarea>
                            <button type="submit" class="bg-purple-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-purple-700 transition-colors">登记工时</button>
                        </form>
                    </div>

                    <div class="space-y-3">
                        <h4 class="text-sm font-bold text-gray-900 flex justify-between items-center">
                            <span>工时记录</span>
                            <span class="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">总计: ${sprint.time_spent || 0}h</span>
                        </h4>
                        <div class="max-h-60 overflow-y-auto pr-2 space-y-2">
                            ${logs.length > 0 ? logs.map(log => `
                                <div class="bg-white border border-gray-100 p-3 rounded-lg text-sm shadow-sm flex justify-between items-start">
                                    <div>
                                        <div class="font-semibold text-gray-800">${log.user_name}</div>
                                        <div class="text-gray-500 text-xs">${log.date}</div>
                                        ${log.description ? `<div class="text-gray-600 mt-1 italic">"${log.description}"</div>` : ''}
                                    </div>
                                    <div class="font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded text-xs">
                                        ${log.hours}h
                                    </div>
                                </div>
                            `).join('') : '<div class="text-gray-400 text-sm text-center py-4 italic">暂无工时记录。</div>'}
                        </div>
                    </div>
                </div>
            `);
        };

        MiniAgile.modals.modalBindBoardRequirements = async function(projectId, sprintId) {
            const requirements = await this.api(`/projects/${projectId}/requirements`);
            if (!Array.isArray(requirements)) {
                alert(requirements?.error || '加载需求列表失败');
                return;
            }

            const currentCount = requirements.filter(requirement => requirement.sprint_id === sprintId).length;
            const formId = `board-bind-requirements-form-${sprintId}`;
            const footerStyle = 'flex:0 0 auto; padding:0.875rem 1.5rem; background:rgba(255,255,255,0.98); box-shadow:0 -1px 0 rgba(148,163,184,0.22), 0 -8px 24px rgba(15,23,42,0.05);';
            const requirementItems = requirements.map((requirement) => {
                const isCurrent = requirement.sprint_id === sprintId;
                const isOccupied = Boolean(requirement.sprint_id) && !isCurrent;
                const title = this.escapeHtml(requirement.title || '未命名需求');
                const sprintName = this.escapeHtml(requirement.sprint_name || '其他迭代');
                const searchText = this.escapeHtml(`${requirement.title || ''} ${requirement.content || ''}`.toLowerCase());
                const stateText = isOccupied
                    ? `已被“${sprintName}”绑定`
                    : (isCurrent ? '已绑定当前迭代' : '未绑定迭代');
                const stateClass = isOccupied
                    ? 'text-amber-700 bg-amber-50'
                    : (isCurrent ? 'text-purple-700 bg-purple-50' : 'text-gray-500 bg-gray-100');
                return `
                    <label data-board-requirement-item data-search="${searchText}" class="flex items-center gap-3 rounded-lg border p-4 transition-colors ${isOccupied ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-70' : 'border-gray-200 bg-white cursor-pointer hover:border-purple-300 hover:bg-purple-50'}">
                        <input type="checkbox" name="requirement_ids" value="${requirement.id}" data-originally-bound="${isCurrent}" ${isCurrent ? 'checked' : ''} ${isOccupied ? 'disabled' : ''} onchange="window.updateBoardRequirementBindingCount && window.updateBoardRequirementBindingCount()" class="w-4 h-4 shrink-0 rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:cursor-not-allowed">
                        <span class="min-w-0 flex-1">
                            <span class="block truncate text-sm font-semibold text-gray-900">${title}</span>
                            <span class="mt-1 inline-flex rounded px-2 py-0.5 text-xs font-medium ${stateClass}">${stateText}</span>
                        </span>
                    </label>
                `;
            }).join('');

            this.modalShow(`
                <div style="padding:1.5rem 1.5rem 1rem" class="shrink-0 border-b border-gray-100 bg-white">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <h3 class="text-xl font-bold text-gray-900 mb-1">绑定需求</h3>
                            <p class="text-sm text-gray-500">选择要在当前迭代看板中显示的需求泳道</p>
                        </div>
                        <span id="board-bind-requirements-count" class="shrink-0 text-xs font-semibold text-purple-700">已选 ${currentCount} 个</span>
                    </div>
                    <div class="relative mt-4">
                        <i class="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                        <input type="text" data-testid="board-bind-requirements-search" placeholder="搜索需求标题或内容..." oninput="window.filterBoardRequirementBindings && window.filterBoardRequirementBindings(this.value)" class="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-4 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500">
                    </div>
                </div>
                <form id="${formId}" onsubmit="app.handlers.updateBoardSprintRequirements(event, ${projectId}, ${sprintId})" class="min-h-0">
                    <div id="board-bind-requirements-list" data-testid="board-bind-requirements-list" class="max-h-80 min-h-0 overflow-y-auto p-6">
                        ${requirements.length > 0 ? `<div class="space-y-3">${requirementItems}</div>` : `
                            <div class="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">当前项目暂无需求</div>
                        `}
                    </div>
                </form>
            `, {
                contentClass: 'w-full',
                contentStyle: 'width:min(94vw, 38rem); max-width:min(94vw, 38rem); max-height:84vh; overflow:hidden',
                frameStyle: 'max-height:84vh; min-height:0; display:flex; flex-direction:column; overflow:hidden',
                bodyClass: 'flex min-h-0 flex-col',
                bodyStyle: 'padding:0; overflow:hidden',
                footerHtml: `
                    <div data-testid="board-bind-requirements-footer" style="${footerStyle}" class="flex justify-end gap-3">
                        <button type="button" onclick="app.modals.close()" class="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">取消</button>
                        <button type="submit" form="${formId}" data-testid="board-bind-requirements-submit" class="px-5 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors">
                            <i class="fa-solid fa-save mr-1.5"></i>保存绑定
                        </button>
                    </div>
                `
            });
        };

})();
