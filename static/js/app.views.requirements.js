(function () {
    const MiniAgile = window.MiniAgile = window.MiniAgile || {};
    MiniAgile.views = MiniAgile.views || {};

        MiniAgile.views.viewRequirements = async function(projectId, params = {}) {
            const projectData = await this.api(`/projects/${projectId}`);
            if (projectData.error) {
                this.setMain(`<div class="p-8 text-center text-red-600">无法加载项目数据</div>`);
                return;
            }

            this.currentProject = projectData.project;
            this.currentOrg = projectData.organization || projectData.project.organization || (projectData.project.organization_id ? { id: projectData.project.organization_id, name: '组织' } : null);
            this.currentTeam = null;
            this.renderSidebar();
            this.renderTopContext();

            const queryParams = new URLSearchParams(params);
            const requirements = await this.api(`/projects/${projectId}/requirements?${queryParams.toString()}`);
            const stats = await this.api(`/projects/${projectId}/requirements/stats`);

            if (requirements.error) {
                this.setMain(`<div class="p-8 text-center text-red-600">加载需求列表失败</div>`);
                return;
            }

            const statusLabels = {
                'pending': '等待排期',
                'in_progress': '开发中',
                'testing': '等待测试',
                'completed': '已完成'
            };

            const statusColors = {
                'pending': 'bg-gray-100 text-gray-700 border-gray-300',
                'in_progress': 'bg-purple-100 text-purple-700 border-purple-300',
                'testing': 'bg-blue-100 text-blue-700 border-blue-300',
                'completed': 'bg-emerald-100 text-emerald-700 border-emerald-300'
            };

            const priorityLabels = {
                1: 'P0-最高',
                2: 'P1-高',
                3: 'P2-中',
                4: 'P3-低',
                5: 'P4-最低'
            };

            const priorityColors = {
                1: 'bg-red-100 text-red-700 border-red-300',
                2: 'bg-orange-100 text-orange-700 border-orange-300',
                3: 'bg-yellow-100 text-yellow-700 border-yellow-300',
                4: 'bg-blue-100 text-blue-700 border-blue-300',
                5: 'bg-gray-100 text-gray-700 border-gray-300'
            };

            this.setMain(`
                <div id="requirements-page" class="max-w-7xl mx-auto p-8 space-y-6">
                    <!-- Header -->
                    <div class="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 class="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                <span class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                                    <i class="fa-solid fa-file-lines text-white text-lg"></i>
                                </span>
                                需求管理
                            </h1>
                            <p class="mt-2 text-sm text-gray-600">管理和跟踪产品需求</p>
                        </div>
                        <div class="flex flex-wrap items-center gap-3">
                            ${requirements.length > 0 ? `
                            <button type="button" id="requirement-multi-select-button" data-testid="requirement-multi-select-button" onclick="app.toggleRequirementMultiSelect(true)" class="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors">
                                <i class="fa-solid fa-check-double"></i>
                                <span>多选</span>
                            </button>` : ''}
                            <button type="button" data-testid="create-requirement-button" onclick="app.modals.createRequirement(${projectId})" class="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-colors shadow-sm">
                                <i class="fa-solid fa-plus"></i>
                                <span>新建需求</span>
                            </button>
                        </div>
                    </div>

                    <!-- Stats Cards -->
                    ${stats && !stats.error ? `
                    <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div class="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm font-medium text-gray-600">总需求</p>
                                    <p class="text-2xl font-bold text-gray-900 mt-1">${stats.total}</p>
                                </div>
                                <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                                    <i class="fa-solid fa-list text-gray-600 text-lg"></i>
                                </div>
                            </div>
                        </div>
                        <div class="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm font-medium text-gray-600">等待排期</p>
                                    <p class="text-2xl font-bold text-gray-900 mt-1">${stats.pending}</p>
                                </div>
                                <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                                    <i class="fa-solid fa-clock text-gray-600 text-lg"></i>
                                </div>
                            </div>
                        </div>
                        <div class="bg-white rounded-xl border border-purple-200 p-5 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-purple-50 to-white">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm font-medium text-purple-600">开发中</p>
                                    <p class="text-2xl font-bold text-purple-700 mt-1">${stats.in_progress}</p>
                                </div>
                                <div class="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                                    <i class="fa-solid fa-code text-purple-600 text-lg"></i>
                                </div>
                            </div>
                        </div>
                        <div class="bg-white rounded-xl border border-blue-200 p-5 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-blue-50 to-white">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm font-medium text-blue-600">等待测试</p>
                                    <p class="text-2xl font-bold text-blue-700 mt-1">${stats.testing}</p>
                                </div>
                                <div class="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                    <i class="fa-solid fa-vial text-blue-600 text-lg"></i>
                                </div>
                            </div>
                        </div>
                        <div class="bg-white rounded-xl border border-emerald-200 p-5 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-emerald-50 to-white">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm font-medium text-emerald-600">已完成</p>
                                    <p class="text-2xl font-bold text-emerald-700 mt-1">${stats.completed}</p>
                                </div>
                                <div class="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <i class="fa-solid fa-check text-emerald-600 text-lg"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    ` : ''}

                    <!-- Filters and Search -->
                    <div class="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <div class="flex flex-wrap items-center gap-4">
                            <div class="flex-1 min-w-[300px]">
                                <div class="relative">
                                    <i class="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                    <input type="text" id="req-search-input" placeholder="搜索需求标题或内容..." class="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all">
                                </div>
                            </div>
                            <select id="req-status-filter" class="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all">
                                <option value="">全部状态</option>
                                <option value="pending">等待排期</option>
                                <option value="in_progress">开发中</option>
                                <option value="testing">等待测试</option>
                                <option value="completed">已完成</option>
                            </select>
                            <select id="req-priority-filter" class="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all">
                                <option value="">全部优先级</option>
                                <option value="1">P0-最高</option>
                                <option value="2">P1-高</option>
                                <option value="3">P2-中</option>
                                <option value="4">P3-低</option>
                                <option value="5">P4-最低</option>
                            </select>
                            <button type="button" data-testid="requirement-filter-button" onclick="app.requirementsFilter(${projectId})" class="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all font-medium shadow-sm">
                                <i class="fa-solid fa-filter mr-2"></i>筛选
                            </button>
                        </div>
                    </div>

                    <div id="requirement-batch-toolbar" data-testid="requirement-batch-toolbar" class="requirement-batch-toolbar-fixed hidden border-t border-purple-200 px-4 py-3">
                        <div class="flex flex-col items-stretch justify-between gap-3 md:flex-row md:items-center">
                            <span class="text-sm font-semibold text-gray-700">已选择 <span id="requirement-selected-count" class="text-purple-700">0</span> 项</span>
                            <div class="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
                                <button type="button" onclick="app.toggleRequirementMultiSelect(false)" class="whitespace-nowrap px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">取消</button>
                                <button type="button" id="requirement-batch-delete-button" data-testid="requirement-batch-delete-button" onclick="app.handlers.batchDeleteRequirements(${projectId})" disabled class="whitespace-nowrap px-3 py-2 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                                    <i class="fa-solid fa-trash mr-1.5"></i>批量删除
                                </button>
                                <button type="button" id="requirement-batch-bind-button" data-testid="requirement-batch-bind-button" onclick="app.openRequirementSprintBinding(${projectId})" disabled class="whitespace-nowrap px-3 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                                    <i class="fa-solid fa-link mr-1.5"></i>批量绑定迭代
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Requirements List -->
                    <div id="requirements-list" class="space-y-3">
                        ${requirements.length === 0 ? `
                            <div class="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
                                <div class="w-16 h-16 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center">
                                    <i class="fa-solid fa-file-lines text-gray-400 text-2xl"></i>
                                </div>
                                <h3 class="text-lg font-semibold text-gray-900 mb-2">暂无需求</h3>
                                <p class="text-gray-600 mb-4">开始创建第一个需求吧</p>
                                <button type="button" data-testid="create-requirement-empty-button" onclick="app.modals.createRequirement(${projectId})" class="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all font-medium">
                                    <i class="fa-solid fa-plus mr-2"></i>新建需求
                                </button>
                            </div>
                        ` : requirements.map(req => `
                            <div data-requirement-card data-requirement-id="${req.id}" class="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group" onclick="app.handleRequirementCardClick(event, ${req.id})">
                                <div class="flex items-start justify-between gap-4">
                                    <label data-requirement-selector style="align-self:center" class="hidden shrink-0" onclick="event.stopPropagation()">
                                        <input type="checkbox" data-requirement-checkbox value="${req.id}" onchange="app.updateRequirementSelection()" class="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500" aria-label="选择需求 ${req.title}">
                                    </label>
                                    <div class="flex-1 min-w-0">
                                        <div class="flex flex-wrap items-center gap-3 mb-2">
                                            <h3 class="min-w-0 text-lg font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">${req.title}</h3>
                                            <span class="px-2.5 py-1 text-xs font-semibold rounded-full border ${priorityColors[req.priority]}">${priorityLabels[req.priority]}</span>
                                            <span class="px-2.5 py-1 text-xs font-semibold rounded-full border ${statusColors[req.status]}">${statusLabels[req.status]}</span>
                                        </div>
                                        <p class="text-sm text-gray-600 mb-3 line-clamp-2">${req.content}</p>
                                        <div class="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                                            <span><i class="fa-solid fa-user mr-1"></i>${req.creator_name || '未知'}</span>
                                            <span><i class="fa-solid fa-calendar mr-1"></i>创建于 ${new Date(req.created_at).toLocaleDateString('zh-CN')}</span>
                                            ${req.expected_delivery_date ? `<span class="text-orange-600 font-medium"><i class="fa-solid fa-flag mr-1"></i>期待交付 ${new Date(req.expected_delivery_date).toLocaleDateString('zh-CN')}</span>` : ''}
                                            ${req.sprint_name ? `<span class="text-purple-600"><i class="fa-solid fa-rotate mr-1"></i>${req.sprint_name}</span>` : ''}
                                        </div>
                                    </div>
                                    <div class="flex gap-2">
                                        <button onclick="event.stopPropagation(); app.modals.editRequirement(${req.id})" class="w-8 h-8 rounded-lg bg-gray-100 hover:bg-purple-100 text-gray-600 hover:text-purple-700 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                                            <i class="fa-solid fa-edit text-sm"></i>
                                        </button>
                                        <button onclick="event.stopPropagation(); app.handlers.deleteRequirement(${req.id}, ${projectId})" class="w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-700 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                                            <i class="fa-solid fa-trash text-sm"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `, () => {
                const searchInput = document.getElementById('req-search-input');
                if (searchInput) {
                    searchInput.addEventListener('keyup', (e) => {
                        if (e.key === 'Enter') {
                            this.requirementsFilter(projectId);
                        }
                    });
                }

                if (params.search && searchInput) searchInput.value = params.search;
                const statusSelect = document.getElementById('req-status-filter');
                if (params.status && statusSelect) statusSelect.value = params.status;
                const prioritySelect = document.getElementById('req-priority-filter');
                if (params.priority && prioritySelect) prioritySelect.value = params.priority;
            });
        };

        MiniAgile.views.toggleRequirementMultiSelect = function(enabled) {
            const list = document.getElementById('requirements-list');
            const toolbar = document.getElementById('requirement-batch-toolbar');
            const page = document.getElementById('requirements-page');
            if (!list || !toolbar) return;
            list.dataset.multiSelect = enabled ? 'true' : 'false';
            toolbar.classList.toggle('hidden', !enabled);
            document.getElementById('requirement-multi-select-button')?.classList.toggle('hidden', enabled);
            document.querySelectorAll('[data-requirement-selector]').forEach((selector) => {
                selector.classList.toggle('hidden', !enabled);
            });
            if (!enabled) {
                document.querySelectorAll('[data-requirement-checkbox]').forEach((checkbox) => {
                    checkbox.checked = false;
                });
            }
            if (page) {
                page.style.paddingBottom = enabled ? `${toolbar.offsetHeight + 24}px` : '';
            }
            this.updateRequirementSelection();
        };

        MiniAgile.views.getSelectedRequirementIds = function() {
            return Array.from(document.querySelectorAll('[data-requirement-checkbox]:checked'))
                .map((checkbox) => Number(checkbox.value));
        };

        MiniAgile.views.updateRequirementSelection = function() {
            const selectedIds = this.getSelectedRequirementIds();
            const count = document.getElementById('requirement-selected-count');
            if (count) count.textContent = String(selectedIds.length);
            ['requirement-batch-delete-button', 'requirement-batch-bind-button'].forEach((id) => {
                const button = document.getElementById(id);
                if (button) button.disabled = selectedIds.length === 0;
            });
            document.querySelectorAll('[data-requirement-card]').forEach((card) => {
                const checkbox = card.querySelector('[data-requirement-checkbox]');
                card.classList.toggle('border-purple-500', Boolean(checkbox?.checked));
                card.classList.toggle('bg-purple-50', Boolean(checkbox?.checked));
            });
        };

        MiniAgile.views.handleRequirementCardClick = function(event, requirementId) {
            const list = document.getElementById('requirements-list');
            if (list?.dataset.multiSelect !== 'true') {
                this.modals.viewRequirement(requirementId);
                return;
            }
            const checkbox = event.currentTarget.querySelector('[data-requirement-checkbox]');
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
                this.updateRequirementSelection();
            }
        };

        MiniAgile.views.openRequirementSprintBinding = function(projectId) {
            const requirementIds = this.getSelectedRequirementIds();
            if (requirementIds.length > 0) {
                this.modals.batchBindRequirementSprint(projectId, requirementIds);
            }
        };

})();
