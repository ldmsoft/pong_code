(function () {
    const MiniAgile = window.MiniAgile = window.MiniAgile || {};
    MiniAgile.modals = MiniAgile.modals || {};

        MiniAgile.modals.modalShow = function(html, options = {}) {
            this.modalOptions = {
                contentClass: options.contentClass || '',
                contentStyle: options.contentStyle || '',
                frameStyle: options.frameStyle || '',
                bodyClass: options.bodyClass || '',
                bodyStyle: options.bodyStyle || '',
                footerHtml: options.footerHtml || '',
                showResizeHint: !!options.showResizeHint
            };
            this.modalHtml = `
                <div class="px-6 py-4 border-b border-gray-200 flex shrink-0 justify-between items-center bg-gradient-to-r from-purple-50 to-white">
                     <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                            <i class="fa-solid fa-bolt text-white text-sm"></i>
                        </div>
                        <h3 class="text-lg font-bold text-gray-900">PongCode</h3>
                     </div>
                     <button type="button" onclick="app.modals.close()" class="text-gray-400 hover:text-gray-600 w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-all cursor-pointer">
                        <i class="fa-solid fa-times"></i>
                     </button>
                </div>
                ${this.modalOptions.showResizeHint ? `
                <div class="text-[11px] text-gray-400 px-6 pt-3 select-none">
                    可拖动右下角调整弹窗大小
                </div>
                ` : ''}
                <div class="${this.modalOptions.bodyClass || 'p-6'}" style="${this.modalOptions.bodyStyle || ''}">
                    ${html}
                </div>
                ${this.modalOptions.footerHtml || ''}
            `;
            this.showModal = true;
        };

        MiniAgile.modals.modalClose = function() {
            this.showModal = false;
            this.modalHtml = '';  // 清空内容，确保下次打开时 DOM 重新渲染
            this.modalOptions = {
                contentClass: '',
                contentStyle: '',
                frameStyle: '',
                bodyClass: '',
                bodyStyle: '',
                footerHtml: '',
                showResizeHint: false
            };
        };

})();
