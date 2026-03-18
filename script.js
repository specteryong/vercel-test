/**
 * 个人日记 + AI 新闻网站
 * 功能：日记管理（云端存储 + 实时保存）、AI 新闻获取、归档展示
 */

// ============================================
// 配置
// ============================================
const CONFIG = {
    API_BASE: '/api/diary',
    STORAGE_KEY_NEWS: 'ai_news_cache',
    NEWS_CACHE_TIME: 30 * 60 * 1000, // 30 分钟缓存
    AUTO_SAVE_DELAY: 1000, // 自动保存延迟（毫秒）
    NEWS_SOURCES: [
        { name: 'Hacker News', url: 'https://hnrss.org/frontpage?q=AI', selector: 'item' },
        { name: 'Reddit AI', url: 'https://www.reddit.com/r/artificial/.rss', selector: 'item' },
    ]
};

// ============================================
// 工具函数
// ============================================
const Utils = {
    // 格式化日期
    formatDate(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    // 格式化显示日期
    formatDisplayDate(date) {
        const d = new Date(date);
        const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
        return d.toLocaleDateString('zh-CN', options);
    },

    // 获取今日日期字符串
    getTodayString() {
        return this.formatDate(new Date());
    },

    // 相对时间
    timeAgo(date) {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };

        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return `${interval}${unit[0]}前`;
            }
        }
        return '刚刚';
    },

    // 截断文本
    truncate(text, length = 100) {
        if (!text) return '';
        return text.length > length ? text.substring(0, length) + '...' : text;
    },

    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // HTML 转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// ============================================
// 日记管理（云端 API 版本）
// ============================================
const DiaryManager = {
    // 本地缓存
    cache: null,

    // 获取所有日记（从 API）
    async getAll() {
        try {
            const response = await fetch(CONFIG.API_BASE);
            if (!response.ok) throw new Error('API 请求失败');
            const data = await response.json();
            this.cache = data;
            return data || {};
        } catch (error) {
            console.error('获取日记失败:', error);
            // 降级：返回缓存或空对象
            return this.cache || {};
        }
    },

    // 保存日记（到 API）
    async save(date, content) {
        try {
            const response = await fetch(CONFIG.API_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, content })
            });
            
            if (!response.ok) throw new Error('保存失败');
            
            // 更新本地缓存
            if (!this.cache) this.cache = {};
            this.cache[date] = {
                content,
                updatedAt: new Date().toISOString()
            };
            
            return true;
        } catch (error) {
            console.error('保存日记失败:', error);
            throw error;
        }
    },

    // 获取指定日期的日记
    get(date) {
        if (!this.cache) return null;
        return this.cache[date] || null;
    },

    // 删除日记
    async delete(date) {
        try {
            const response = await fetch(CONFIG.API_BASE, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date })
            });
            
            if (!response.ok) throw new Error('删除失败');
            
            // 更新本地缓存
            if (this.cache && this.cache[date]) {
                delete this.cache[date];
            }
            
            return true;
        } catch (error) {
            console.error('删除日记失败:', error);
            throw error;
        }
    },

    // 获取日记数量
    getCount() {
        return this.cache ? Object.keys(this.cache).length : 0;
    },

    // 按日期排序获取日记列表
    getSortedList() {
        if (!this.cache) return [];
        return Object.entries(this.cache)
            .sort((a, b) => new Date(b[0]) - new Date(a[0]));
    },

    // 刷新缓存
    async refresh() {
        await this.getAll();
    }
};

// ============================================
// AI 新闻管理
// ============================================
const NewsManager = {
    // 从缓存获取新闻
    getCached() {
        const data = localStorage.getItem(CONFIG.STORAGE_KEY_NEWS);
        if (!data) return null;

        const parsed = JSON.parse(data);
        const now = Date.now();
        if (now - parsed.timestamp > CONFIG.NEWS_CACHE_TIME) {
            return null; // 缓存过期
        }
        return parsed.news;
    },

    // 保存新闻到缓存
    saveCache(news) {
        localStorage.setItem(CONFIG.STORAGE_KEY_NEWS, JSON.stringify({
            timestamp: Date.now(),
            news
        }));
    },

    // 获取新闻（优先缓存，过期则 fetch）
    async fetch() {
        const cached = this.getCached();
        if (cached) {
            return cached;
        }

        // 使用 Hacker News API 获取 AI 相关新闻
        try {
            const news = await this.fetchFromHackerNews();
            this.saveCache(news);
            return news;
        } catch (error) {
            console.error('获取新闻失败:', error);
            // 返回示例新闻作为降级
            return this.getSampleNews();
        }
    },

    // 从 Hacker News API 获取 AI 新闻
    async fetchFromHackerNews() {
        const searchQueries = ['artificial intelligence', 'machine learning', 'LLM', 'GPT', 'AI'];
        const allNews = [];

        for (const query of searchQueries) {
            try {
                const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&numericFilters=points>2&hitsPerPage=10`;
                const response = await fetch(url);
                const data = await response.json();

                if (data.hits) {
                    data.hits.forEach(item => {
                        allNews.push({
                            title: item.title,
                            link: item.url || `https://news.ycombinator.com/item?id=${item.objectID}`,
                            pubDate: item.created_at,
                            source: 'Hacker News',
                            points: item.points
                        });
                    });
                }
            } catch (e) {
                console.warn('Hacker News 获取失败:', e);
            }
        }

        // 去重并排序
        const uniqueNews = Array.from(
            new Map(allNews.map(item => [item.link, item])).values()
        ).sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

        return uniqueNews.slice(0, 15);
    },

    // 示例新闻（降级使用）
    getSampleNews() {
        const now = Date.now();
        return [
            {
                title: 'OpenAI 发布新一代多模态模型，支持更复杂的推理任务',
                link: 'https://openai.com',
                pubDate: new Date(now).toISOString(),
                source: 'AI News'
            },
            {
                title: 'Google DeepMind 新研究：AI 在数学证明领域取得突破',
                link: 'https://deepmind.google',
                pubDate: new Date(now - 3600000).toISOString(),
                source: 'Research'
            },
            {
                title: 'Meta 开源新 LLM 模型，性能媲美 GPT-4',
                link: 'https://ai.meta.com',
                pubDate: new Date(now - 7200000).toISOString(),
                source: 'Open Source'
            },
            {
                title: 'AI 编程助手新 benchmark：人类程序员面临新挑战',
                link: 'https://github.com',
                pubDate: new Date(now - 86400000).toISOString(),
                source: 'Dev Tools'
            },
            {
                title: 'Stability AI 发布新一代图像生成模型',
                link: 'https://stability.ai',
                pubDate: new Date(now - 172800000).toISOString(),
                source: 'Generative AI'
            }
        ];
    },

    // 获取新闻数量
    getCount(news) {
        return news ? news.length : 0;
    }
};

// ============================================
// UI 控制器
// ============================================
const UI = {
    // 自动保存函数
    autoSave: null,
    saveStatusTimer: null,

    // 初始化
    async init() {
        // 先加载日记数据
        await DiaryManager.refresh();
        
        this.bindEvents();
        this.updateDate();
        this.loadTodayDiary();
        this.loadNews();
        this.loadArchive();
        this.updateStats();
    },

    // 绑定事件
    bindEvents() {
        // 移动端菜单
        const menuToggle = document.querySelector('.menu-toggle');
        const navLinks = document.querySelector('.nav-links');
        menuToggle?.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        // 写日记按钮
        document.getElementById('write-diary-btn')?.addEventListener('click', () => {
            this.openModal();
        });

        // 刷新新闻按钮
        document.getElementById('refresh-news-btn')?.addEventListener('click', () => {
            this.loadNews(true);
        });

        // 模态框事件
        this.bindModalEvents();

        // 导航链接滚动
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', (e) => {
                menuToggle?.classList.remove('active');
                navLinks?.classList.remove('active');
                document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
    },

    // 模态框事件绑定
    bindModalEvents() {
        const modal = document.getElementById('diary-modal');
        const closeBtn = modal?.querySelector('.modal-close');
        const cancelBtn = modal?.querySelector('.modal-cancel');
        const saveBtn = modal?.querySelector('.modal-save');

        closeBtn?.addEventListener('click', () => this.closeModal());
        cancelBtn?.addEventListener('click', () => this.closeModal());
        saveBtn?.addEventListener('click', () => this.saveDiary());

        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal?.classList.contains('active')) {
                this.closeModal();
            }
        });
    },

    // 打开模态框
    async openModal() {
        const modal = document.getElementById('diary-modal');
        const input = document.getElementById('diary-input');
        const today = Utils.getTodayString();
        
        // 确保有最新数据
        await DiaryManager.refresh();
        const existing = DiaryManager.get(today);

        if (existing) {
            input.value = existing.content;
        } else {
            input.value = '';
        }

        // 设置实时保存
        this.setupAutoSave(input);

        modal?.classList.add('active');
        input?.focus();
    },

    // 设置自动保存
    setupAutoSave(input) {
        const saveStatus = document.getElementById('save-status');
        
        // 创建保存状态指示器
        if (!saveStatus) {
            const statusEl = document.createElement('div');
            statusEl.id = 'save-status';
            statusEl.style.cssText = `
                position: absolute;
                top: 10px;
                right: 15px;
                font-size: 12px;
                color: #888;
                transition: opacity 0.3s;
            `;
            const modalBody = document.querySelector('.modal-body');
            modalBody?.appendChild(statusEl);
        }

        // 防抖自动保存
        this.autoSave = Utils.debounce(async (content) => {
            if (!content.trim()) return;
            
            const statusEl = document.getElementById('save-status');
            if (statusEl) {
                statusEl.textContent = '保存中...';
                statusEl.style.opacity = '1';
            }

            try {
                const today = Utils.getTodayString();
                await DiaryManager.save(today, content);
                
                if (statusEl) {
                    statusEl.textContent = '✓ 已保存';
                    statusEl.style.color = '#4caf50';
                }

                // 更新统计和归档
                this.updateStats();
                this.loadArchive();
                
            } catch (error) {
                if (statusEl) {
                    statusEl.textContent = '✗ 保存失败';
                    statusEl.style.color = '#f44336';
                }
                console.error('自动保存失败:', error);
            }

            // 2 秒后隐藏状态
            clearTimeout(this.saveStatusTimer);
            this.saveStatusTimer = setTimeout(() => {
                if (statusEl) {
                    statusEl.style.opacity = '0';
                }
            }, 2000);
        }, CONFIG.AUTO_SAVE_DELAY);

        // 监听输入
        input.addEventListener('input', (e) => {
            this.autoSave(e.target.value);
        });
    },

    // 关闭模态框
    closeModal() {
        const modal = document.getElementById('diary-modal');
        modal?.classList.remove('active');
        
        // 清理自动保存
        this.autoSave = null;
        clearTimeout(this.saveStatusTimer);
    },

    // 保存日记（手动保存）
    async saveDiary() {
        const input = document.getElementById('diary-input');
        const content = input?.value?.trim();

        if (!content) {
            alert('请输入日记内容');
            return;
        }

        const today = Utils.getTodayString();
        
        try {
            await DiaryManager.save(today, content);
            this.closeModal();
            this.loadTodayDiary();
            this.loadArchive();
            this.updateStats();
            this.showToast('日记已保存');
        } catch (error) {
            alert('保存失败，请检查网络连接');
            console.error('保存失败:', error);
        }
    },

    // 显示提示
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--accent-color);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 500;
            z-index: 3000;
            animation: fadeIn 0.3s ease;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    },

    // 更新日期显示
    updateDate() {
        const dateEl = document.getElementById('today-date');
        if (dateEl) {
            dateEl.textContent = Utils.formatDisplayDate(new Date());
        }
    },

    // 加载今日日记
    loadTodayDiary() {
        const today = Utils.getTodayString();
        const diary = DiaryManager.get(today);
        const contentEl = document.querySelector('.diary-text');
        const actionEl = document.querySelector('.diary-actions');

        if (diary) {
            contentEl.textContent = diary.content;
            actionEl.innerHTML = `
                <button class="btn btn-primary" onclick="UI.openModal()">编辑</button>
                <button class="btn btn-secondary" onclick="UI.deleteTodayDiary()">删除</button>
            `;
        } else {
            contentEl.textContent = '今天还没有写日记，记录一下今天的想法吧...';
            actionEl.innerHTML = '<button class="btn btn-primary" onclick="UI.openModal()">写日记</button>';
        }
    },

    // 删除今日日记
    async deleteTodayDiary() {
        if (confirm('确定要删除今天的日记吗？')) {
            try {
                const today = Utils.getTodayString();
                await DiaryManager.delete(today);
                this.loadTodayDiary();
                this.loadArchive();
                this.updateStats();
                this.showToast('日记已删除');
            } catch (error) {
                alert('删除失败，请检查网络连接');
                console.error('删除失败:', error);
            }
        }
    },

    // 加载新闻
    async loadNews(forceRefresh = false) {
        const loadingEl = document.getElementById('news-loading');
        const listEl = document.getElementById('news-list');

        if (forceRefresh) {
            localStorage.removeItem(CONFIG.STORAGE_KEY_NEWS);
        }

        loadingEl?.classList.remove('hidden');
        listEl.innerHTML = '';

        try {
            const news = await NewsManager.fetch();
            loadingEl?.classList.add('hidden');

            if (news && news.length > 0) {
                news.forEach((item, index) => {
                    const li = document.createElement('li');
                    li.className = 'news-item fade-in';
                    li.style.animationDelay = `${index * 0.05}s`;
                    li.innerHTML = `
                        <a href="${item.link}" target="_blank" rel="noopener">
                            <div class="news-title">${Utils.escapeHtml(item.title)}</div>
                            <div class="news-meta">
                                <span class="news-source">${Utils.escapeHtml(item.source)}</span>
                                <span class="news-time">${Utils.timeAgo(item.pubDate)}</span>
                            </div>
                        </a>
                    `;
                    listEl.appendChild(li);
                });
            } else {
                listEl.innerHTML = '<li class="news-item">暂无新闻，请稍后再试</li>';
            }
        } catch (error) {
            loadingEl.innerHTML = '<p>加载失败，请刷新重试</p>';
        }
    },

    // 加载归档
    loadArchive() {
        const listEl = document.getElementById('archive-list');
        const diaries = DiaryManager.getSortedList();

        if (diaries.length === 0) {
            listEl.innerHTML = '<p class="text-muted">暂无日记</p>';
            return;
        }

        listEl.innerHTML = '';
        let currentMonth = '';

        diaries.forEach(([date, diary]) => {
            const month = date.substring(0, 7);
            const monthDisplay = new Date(date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });

            if (month !== currentMonth) {
                currentMonth = month;
                const monthEl = document.createElement('div');
                monthEl.className = 'archive-month';
                monthEl.textContent = monthDisplay;
                listEl.appendChild(monthEl);
            }

            const itemEl = document.createElement('div');
            itemEl.className = 'archive-item';
            itemEl.innerHTML = `
                <span class="archive-date">${date}</span>
                <span class="archive-preview">${Utils.truncate(diary.content, 50)}</span>
            `;
            itemEl.addEventListener('click', () => this.viewDiary(date, diary.content));
            listEl.appendChild(itemEl);
        });
    },

    // 查看日记
    viewDiary(date, content) {
        const modal = document.getElementById('diary-modal');
        const input = document.getElementById('diary-input');
        const modalTitle = modal?.querySelector('.modal-header h3');

        if (modalTitle) modalTitle.textContent = `${date} 的日记`;
        if (input) {
            input.value = content;
            input.readOnly = true;
        }

        const saveBtn = modal?.querySelector('.modal-save');
        const cancelBtn = modal?.querySelector('.modal-cancel');
        if (saveBtn) {
            saveBtn.textContent = '编辑';
            saveBtn.onclick = () => {
                input.readOnly = false;
                input.focus();
                saveBtn.textContent = '保存';
                saveBtn.onclick = () => UI.saveDiary();
            };
        }
        if (cancelBtn) {
            cancelBtn.textContent = '关闭';
            cancelBtn.onclick = () => {
                input.readOnly = false;
                this.closeModal();
            };
        }

        modal?.classList.add('active');
    },

    // 更新统计
    async updateStats() {
        const diaryCount = document.getElementById('diary-count');
        const newsCount = document.getElementById('news-count');

        if (diaryCount) {
            diaryCount.textContent = DiaryManager.getCount();
        }

        NewsManager.fetch().then(news => {
            if (newsCount) {
                newsCount.textContent = NewsManager.getCount(news);
            }
        });
    }
};

// ============================================
// 初始化
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const yearEl = document.getElementById('current-year');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }

    UI.init();
});
