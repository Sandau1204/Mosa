const app = {
    data: {
        currentGuildId: null,
        currentChannelId: null,
        replyingToMsgId: null,
        replyingToUser: null,
        actionTarget: null, // Lưu thông tin người dùng đang bị chọn để ban/kick
        chatServers: [],
        chatChannels: [],
        chatMessages: [],
        oldestMessageId: null,
        isLoadingMore: false,
        hasMoreMessages: true,
        statusIcons: {
            online: `<svg class="w-4 h-4" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#23a559"/></svg>`,
            idle: `<svg class="w-4 h-4" viewBox="0 0 24 24"><path fill="#f0b232" d="M21.026 14.223A9.458 9.458 0 0 1 12 21.5a9.5 9.5 0 0 1-9.5-9.5 9.458 9.458 0 0 1 7.277-9.026c.264-.055.498.156.452.418a7.07 7.07 0 0 0 4.148 7.73 7.07 7.07 0 0 0 7.73-4.148c.08-.204.342-.258.463-.08a9.492 9.492 0 0 1 1.456 7.329z"/></svg>`,
            dnd: `<svg class="w-4 h-4" viewBox="0 0 24 24"><path fill="#f23f43" fill-rule="evenodd" clip-rule="evenodd" d="M12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12Zm-7-10h14v-4H5v4Z"/></svg>`,
            invisible: `<svg class="w-4 h-4" viewBox="0 0 24 24"><path fill="#80848e" fill-rule="evenodd" clip-rule="evenodd" d="M12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12Zm0-5.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z"/></svg>`
        }
    },

    async init() {
        // Kiểm tra đăng nhập
        try {
            const res = await fetch('/api/user');
            const authData = await res.json();
            
            if(authData.authenticated) {
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('user-username').innerText = authData.user.username;
                document.getElementById('user-discriminator').innerText = authData.user.discriminator !== '0' ? `#${authData.user.discriminator}` : '';
                document.getElementById('user-avatar').src = authData.user.avatar;
                
                // Load dữ liệu
                this.loadStats();
                this.loadServers();
                this.loadChatData();
                this.startLogPolling();
            }
        } catch(e) {
            console.error("Chưa đăng nhập", e);
        }

        // Lắng nghe thao tác bấm chuột để đóng menu trạng thái nếu click ra ngoài
        document.addEventListener('click', (event) => {
            const dropdown = document.getElementById('status-dropdown-container');
            if (dropdown && !dropdown.contains(event.target)) {
                document.getElementById('status-dropdown-menu')?.classList.add('hidden');
            }
        });
    },

    login() {
        window.location.href = '/login';
    },

    logout() {
        window.location.href = '/logout';
    },

    // Cập nhật tab hiển thị
    switchTab(tabId) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('text-white', 'bg-gray-800/50');
            btn.classList.add('text-gray-400');
        });
        
        const activeBtn = document.querySelector(`.nav-btn[data-target="${tabId}"]`);
        if(activeBtn) {
            activeBtn.classList.add('text-white', 'bg-gray-800/50');
            activeBtn.classList.remove('text-gray-400');
            document.getElementById('page-title').innerText = activeBtn.querySelector('span').innerText;
        }

        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.add('hidden-tab');
        });
        
        const target = document.getElementById(`tab-${tabId}`);
        if (target) {
            target.classList.remove('hidden-tab');
            if(tabId === 'servers') {
                this.showServerList();
                this.loadServers(); // Reload danh sách server
            }
        }
    },

    // --- TỔNG QUAN ---
    async loadStats() {
        try {
            const res = await fetch('/api/stats');
            if(!res.ok) return;
            const data = await res.json();
            document.getElementById('stat-guilds').innerText = data.guilds;
            document.getElementById('stat-members').innerText = data.members.toLocaleString();
            document.getElementById('stat-ping').innerHTML = `${data.ping}<span class="text-sm font-normal text-gray-500 ml-1">ms</span>`;
            document.getElementById('stat-ram').innerHTML = `${data.ram}<span class="text-sm font-normal text-gray-500 ml-1">MB</span>`;
        } catch(e) { console.error("Lỗi lấy thống kê", e); }
    },

    // --- MÁY CHỦ ---
    async loadServers() {
        try {
            const res = await fetch('/api/servers');
            if(!res.ok) return;
            const servers = await res.json();
            const container = document.getElementById('server-list-view');
            container.innerHTML = '';
            servers.forEach(server => {
                container.innerHTML += `
                    <div class="bg-gray-800 border border-gray-700 rounded-2xl p-4 flex flex-col hover:border-gray-600 transition-colors">
                        <div class="flex items-center gap-4 mb-4">
                            <img src="${server.icon}" onerror="this.src='https://placehold.co/100/5865F2/fff?text=SV'" class="w-14 h-14 rounded-xl object-cover border border-gray-700">
                            <div>
                                <h4 class="text-white font-medium truncate w-40">${server.name}</h4>
                                <p class="text-xs text-gray-400">${server.members} thành viên</p>
                            </div>
                        </div>
                        <div class="mt-auto grid grid-cols-2 gap-2">
                            <button onclick="app.viewServer('${server.id}', '${server.name.replace(/'/g, "\\'")}')" class="bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium py-2 rounded-lg transition-colors">
                                Quản lý
                            </button>
                            <button onclick="app.leaveServer('${server.id}')" class="bg-gray-900 border border-gray-700 hover:border-red-500 hover:text-red-400 text-gray-400 text-xs font-medium py-2 rounded-lg transition-colors">
                                Rời
                            </button>
                        </div>
                    </div>
                `;
            });
        } catch(e) { console.error("Lỗi lấy danh sách máy chủ", e); }
    },

    // --- HÀM CHO CUSTOM STATUS DROPDOWN ---
    toggleStatusDropdown() {
        document.getElementById('status-dropdown-menu').classList.toggle('hidden');
    },

    selectStatus(value, text) {
        // Đổi giá trị của thẻ input ẩn
        document.getElementById('bot-status-select').value = value;
        // Cập nhật lại UI nút bấm
        document.getElementById('selected-status-display').innerHTML = `
            ${this.data.statusIcons[value]}
            <span>${text}</span>
        `;
        // Đóng menu
        document.getElementById('status-dropdown-menu').classList.add('hidden');
    },

    showServerList() {
        document.getElementById('server-detail-view').classList.add('hidden-tab');
        document.getElementById('server-list-view').classList.remove('hidden-tab');
        this.data.currentGuildId = null;
    },

    async viewServer(id, name) {
        this.data.currentGuildId = id;
        document.getElementById('server-list-view').classList.add('hidden-tab');
        document.getElementById('server-detail-view').classList.remove('hidden-tab');
        document.getElementById('detail-server-name').innerText = name;
        
        try {
            const res = await fetch(`/api/servers/${id}/members`);
            if(!res.ok) return;
            const members = await res.json();
            const tbody = document.getElementById('member-list-tbody');
            tbody.innerHTML = '';
            
            members.forEach(m => {
                const botBadge = m.bot ? `<span class="bg-indigo-500 text-[10px] font-bold px-1 rounded text-white ml-2">BOT</span>` : '';
                tbody.innerHTML += `
                    <tr>
                        <td class="py-3">
                            <div class="flex items-center gap-3">
                                <img src="${m.avatar}" onerror="this.src='https://placehold.co/100/333/fff'" class="w-8 h-8 rounded-full">
                                <span class="font-medium text-gray-200 truncate w-32">${m.name} ${botBadge}</span>
                            </div>
                        </td>
                        <td class="py-3 text-gray-400"><span class="bg-gray-700/50 px-2 py-0.5 rounded text-xs border border-gray-700">${m.role}</span></td>
                        <td class="py-3 text-right">
                            <div class="relative inline-block text-left group">
                                <button class="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors">
                                    <i class="ph-bold ph-dots-three-vertical"></i>
                                </button>
                                <div class="absolute right-0 mt-1 w-32 bg-gray-800 border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 overflow-hidden">
                                    <button onclick="app.openMemberAction('timeout', '${m.name.replace(/'/g, "\\'")}', '${m.avatar}', '${m.id}')" class="w-full text-left px-4 py-2 text-xs text-yellow-400 hover:bg-gray-700">Hạn chế (Mute)</button>
                                    <button onclick="app.openMemberAction('kick', '${m.name.replace(/'/g, "\\'")}', '${m.avatar}', '${m.id}')" class="w-full text-left px-4 py-2 text-xs text-orange-400 hover:bg-gray-700">Kick</button>
                                    <button onclick="app.openMemberAction('ban', '${m.name.replace(/'/g, "\\'")}', '${m.avatar}', '${m.id}')" class="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-gray-700">Ban</button>
                                </div>
                            </div>
                        </td>
                    </tr>
                `;
            });
        } catch(e) { console.error("Lỗi lấy thành viên", e); }
    },

    async leaveServer(guildId) {
        if(!guildId) guildId = this.data.currentGuildId;
        if(!confirm("Bạn có chắc muốn Bot rời khỏi máy chủ này?")) return;
        
        try {
            const res = await fetch(`/api/servers/${guildId}/leave`, { method: 'POST' });
            const data = await res.json();
            if(data.success) {
                window.alert("Bot đã rời máy chủ.");
                this.showServerList();
                this.loadServers();
            } else {
                window.alert("Lỗi: " + data.error);
            }
        } catch(e) { window.alert("Có lỗi xảy ra khi rời server"); }
    },

    async openServerInviteModal() {
        if(!this.data.currentGuildId) return;
        document.getElementById('server-invite-link').innerText = "Đang tạo link...";
        this.openModal('serverInviteModal');
        
        try {
            const res = await fetch(`/api/servers/${this.data.currentGuildId}/invite`, { method: 'POST' });
            const data = await res.json();
            if(data.invite_url) {
                document.getElementById('server-invite-link').innerText = data.invite_url;
            } else {
                document.getElementById('server-invite-link').innerText = "Không thể tạo link (Thiếu quyền)";
            }
        } catch(e) {
            document.getElementById('server-invite-link').innerText = "Lỗi kết nối";
        }
    },

    openMemberAction(actionType, name, avatar, id) {
        this.closeAllModals();
        this.data.actionTarget = { actionType, id };
        
        document.getElementById('action-username').innerText = name;
        document.getElementById('action-avatar').src = avatar;
        document.getElementById('action-id').innerText = `ID: ${id}`;
        document.getElementById('action-reason').value = '';
        
        const titleEl = document.getElementById('action-title');
        const btnEl = document.getElementById('action-submit-btn');
        const timeoutWrap = document.getElementById('timeout-duration-wrap');
        timeoutWrap.classList.add('hidden-tab');
        
        btnEl.className = "w-full mt-2 font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center text-white";
        
        if(actionType === 'timeout') {
            titleEl.innerText = "Hạn chế thành viên";
            btnEl.innerText = "Áp dụng hạn chế";
            btnEl.classList.add('bg-yellow-600', 'hover:bg-yellow-500');
            timeoutWrap.classList.remove('hidden-tab');
        } else if (actionType === 'kick') {
            titleEl.innerText = "Đuổi thành viên";
            btnEl.innerText = "Kick thành viên";
            btnEl.classList.add('bg-orange-600', 'hover:bg-orange-500');
        } else if (actionType === 'ban') {
            titleEl.innerText = "Cấm thành viên";
            btnEl.innerText = "Ban thành viên";
            btnEl.classList.add('bg-red-600', 'hover:bg-red-500');
        }
        
        this.openModal('memberActionModal');
    },

    async submitMemberAction() {
        if(!this.data.actionTarget || !this.data.currentGuildId) return;
        
        const { actionType, id } = this.data.actionTarget;
        const reason = document.getElementById('action-reason').value.trim() || "Không có lý do";
        const payload = { action: actionType, reason: reason };
        
        if(actionType === 'timeout') {
            payload.duration = parseInt(document.getElementById('action-duration').value);
        }

        try {
            const res = await fetch(`/api/servers/${this.data.currentGuildId}/members/${id}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if(data.success) {
                window.alert("Thực hiện thành công!");
                this.closeAllModals();
                this.viewServer(this.data.currentGuildId, document.getElementById('detail-server-name').innerText); // Reload list
            } else {
                window.alert("Lỗi: " + data.error);
            }
        } catch(e) { window.alert("Lỗi kết nối khi gửi yêu cầu."); }
    },

    // --- BẢNG NHẮN TIN (CHAT) ---
    async loadChatData() {
        try {
            const res = await fetch('/api/chat/servers');
            if(!res.ok) return;
            this.data.chatServers = await res.json();
            
            const srvContainer = document.getElementById('chat-server-list');
            srvContainer.innerHTML = '';
            
            this.data.chatServers.forEach((s) => {
                srvContainer.innerHTML += `
                    <button onclick="app.selectChatServer('${s.id}')" class="w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2 text-gray-400 hover:bg-gray-700/30 focus:text-white focus:bg-gray-700/50">
                        <div class="w-6 h-6 rounded bg-gray-700 flex items-center justify-center text-xs shrink-0 uppercase">${s.name.charAt(0)}</div>
                        <span class="truncate">${s.name}</span>
                    </button>
                `;
            });

            if(this.data.chatServers.length > 0) {
                this.selectChatServer(this.data.chatServers[0].id);
            }
        } catch(e) {}
    },

    selectChatServer(serverId) {
        const srv = this.data.chatServers.find(s => s.id === serverId);
        if(!srv) return;
        
        const chContainer = document.getElementById('chat-channel-list');
        chContainer.innerHTML = '';
        
        srv.channels.forEach((c) => {
            chContainer.innerHTML += `
                <button onclick="app.selectChannel('${c.id}', '${c.name.replace(/'/g, "\\'")}')" class="w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2 text-gray-400 hover:bg-gray-700/30 focus:text-white focus:bg-gray-700/50">
                    <i class="ph ph-hash"></i> <span class="truncate">${c.name}</span>
                </button>
            `;
        });

        if(srv.channels.length > 0) {
            this.selectChannel(srv.channels[0].id, srv.channels[0].name);
        }
    },

    async selectChannel(channelId, channelName) {
        this.data.currentChannelId = channelId;
        document.getElementById('current-chat-channel').innerText = channelName;
        this.cancelReply();
        
        this.data.oldestMessageId = null;
        this.data.hasMoreMessages = true;
        const container = document.getElementById('chat-messages');
        container.innerHTML = '<div class="text-center text-gray-500 my-4 text-xs">Đang tải tin nhắn...</div>';
        
        try {
            const res = await fetch(`/api/channels/${channelId}/messages`);
            if(!res.ok) {
                container.innerHTML = '<div class="text-center text-red-500 my-4 text-xs">Lỗi: Không thể tải tin nhắn. Hãy kiểm tra lại console bot.</div>';
                return;
            }
            const msgs = await res.json();
            this.data.chatMessages = msgs;
            
            if (msgs.length > 0) {
                this.data.oldestMessageId = msgs[0].id;
                if (msgs.length < 30) this.data.hasMoreMessages = false;
            }

            this.renderChatMessages(true);
            this.setupChatScrollListener();
        } catch(e) {
            container.innerHTML = '<div class="text-center text-red-500 my-4 text-xs">Mất kết nối với Bot.</div>';
        }
    },

    generateMessageHTML(msg) {
        const botBadge = msg.bot ? `<span class="bg-indigo-500 text-[10px] font-bold px-1 rounded text-white flex items-center gap-0.5 ml-2"><i class="ph-fill ph-check-circle"></i> BOT</span>` : '';
        const safeContent = msg.content ? msg.content.replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
        
        // Render HTML cho Reply
        let replyHTML = '';
        if (msg.reply_info) {
            const safeReplyContent = msg.reply_info.content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            replyHTML = `
                <div class="flex items-center gap-2 text-xs text-gray-400 mb-1 ml-10 relative">
                    <div class="absolute left-[-26px] top-[50%] w-6 h-[14px] border-l-2 border-t-2 border-gray-600 rounded-tl-lg -mt-[14px]"></div>
                    <img src="https://placehold.co/20/333/fff" class="w-4 h-4 rounded-full opacity-60">
                    <span class="font-medium text-gray-300">@${msg.reply_info.author}</span>
                    <span class="truncate max-w-[250px] opacity-80 cursor-default hover:text-white transition-colors" title="${safeReplyContent}">${safeReplyContent}</span>
                </div>
            `;
        }

        // Render HTML cho Embeds
        let embedsHTML = '';
        if (msg.embeds && msg.embeds.length > 0) {
            embedsHTML = msg.embeds.map(emb => `
                <div class="mt-1.5 flex max-w-sm">
                    <div class="w-1 rounded-l shrink-0" style="background-color: ${emb.color};"></div>
                    <div class="bg-gray-900/60 rounded-r p-3 w-full border border-gray-700/30">
                        ${emb.title ? `<div class="font-bold text-white mb-1.5 text-sm">${emb.title}</div>` : ''}
                        ${emb.description ? `<div class="text-[13px] text-gray-300 whitespace-pre-wrap leading-relaxed">${emb.description.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>` : ''}
                        ${emb.image ? `<img src="${emb.image}" class="mt-2 rounded-lg max-w-full object-cover max-h-48 border border-gray-700/50">` : ''}
                    </div>
                </div>
            `).join('');
        }

        let attachmentsHTML = '';
        if (msg.attachments && msg.attachments.length > 0) {
            attachmentsHTML = msg.attachments.map(att => {
                if (att.is_image) {
                    return `<div class="mt-2"><img src="${att.url}" alt="${att.filename}" class="rounded-lg max-w-sm object-cover max-h-64 border border-gray-700/50 cursor-pointer hover:opacity-90 transition-opacity" onclick="window.open('${att.url}', '_blank')"></div>`;
                } else {
                    return `<div class="mt-2 flex items-center gap-3 bg-gray-800 p-3 rounded-lg border border-gray-700 max-w-sm hover:bg-gray-700 transition-colors">
                                <i class="ph-fill ph-file-arrow-down text-2xl text-indigo-400"></i>
                                <div class="flex-1 min-w-0">
                                    <a href="${att.url}" target="_blank" class="text-sm font-medium text-indigo-400 hover:underline truncate block" title="${att.filename}">${att.filename}</a>
                                    <span class="text-[11px] text-gray-500">Tệp đính kèm</span>
                                </div>
                            </div>`;
                }
            }).join('');
        }

        return `
            <div class="group flex flex-col hover:bg-gray-700/20 py-2 px-2 rounded-lg transition-colors -mx-2">
                ${replyHTML}
                <div class="flex gap-3">
                    <img src="${msg.avatar}" onerror="this.src='https://placehold.co/100/333/fff'" class="w-10 h-10 rounded-full shrink-0 mt-0.5">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center mb-0.5">
                            <span class="font-medium text-white">${msg.author}</span>
                            ${botBadge}
                            <span class="text-xs text-gray-500 ml-2">${msg.time}</span>
                        </div>
                        ${safeContent ? `<div class="text-sm text-gray-200 break-words whitespace-pre-wrap">${safeContent}</div>` : ''}
                        ${attachmentsHTML}
                        ${embedsHTML}
                    </div>
                    <div class="opacity-0 group-hover:opacity-100 transition-opacity flex items-start">
                        <button onclick="app.setReply('${msg.id}', '${msg.author.replace(/'/g, "\\'")}')" class="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-gray-300 transition-colors shadow-sm" title="Trả lời">
                            <i class="ph ph-arrow-u-up-left"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    renderChatMessages(scrollToBottom = false) {
        const container = document.getElementById('chat-messages');
        const html = this.data.chatMessages.map(msg => this.generateMessageHTML(msg)).join('');
        container.innerHTML = html;
        
        if (scrollToBottom) {
            container.scrollTop = container.scrollHeight;
        }
    },

    setupChatScrollListener() {
        const container = document.getElementById('chat-messages');
        container.onscroll = () => {
            if (container.scrollTop === 0) {
                this.loadOlderMessages();
            }
        };
    },

    async loadOlderMessages() {
        if (this.data.isLoadingMore || !this.data.hasMoreMessages || !this.data.oldestMessageId) return;
        
        this.data.isLoadingMore = true;
        const container = document.getElementById('chat-messages');
        
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'chat-loading-older';
        loadingDiv.className = 'text-center text-gray-500 my-2 text-xs';
        loadingDiv.innerText = 'Đang tải tin nhắn cũ...';
        container.prepend(loadingDiv);

        const oldScrollHeight = container.scrollHeight;

        try {
            const res = await fetch(`/api/channels/${this.data.currentChannelId}/messages?before=${this.data.oldestMessageId}`);
            if (!res.ok) return;
            const olderMsgs = await res.json();
            
            document.getElementById('chat-loading-older')?.remove();

            if (olderMsgs.length === 0) {
                this.data.hasMoreMessages = false;
                return;
            }

            if (olderMsgs.length < 30) this.data.hasMoreMessages = false;
            this.data.oldestMessageId = olderMsgs[0].id;

            this.data.chatMessages = [...olderMsgs, ...this.data.chatMessages];
            
            this.renderChatMessages(false);
            
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - oldScrollHeight;

        } catch (e) {
            document.getElementById('chat-loading-older')?.remove();
        } finally {
            this.data.isLoadingMore = false;
        }
    },

    setReply(msgId, author) {
        this.data.replyingToMsgId = msgId;
        this.data.replyingToUser = author;
        document.getElementById('reply-indicator').classList.remove('hidden-tab');
        document.getElementById('reply-target-name').innerText = `@${author}`;
        document.getElementById('chat-input').focus();
    },

    cancelReply() {
        this.data.replyingToMsgId = null;
        this.data.replyingToUser = null;
        document.getElementById('reply-indicator').classList.add('hidden-tab');
    },

    async sendMessage(e) {
        e.preventDefault();
        const input = document.getElementById('chat-input');
        const content = input.value.trim();
        
        if (!content || !this.data.currentChannelId) return;

        const payload = { content: content };
        if (this.data.replyingToMsgId) {
            payload.reply_to = this.data.replyingToMsgId;
        }

        input.disabled = true;
        
        try {
            const res = await fetch(`/api/channels/${this.data.currentChannelId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if(res.ok) {
                input.value = '';
                this.cancelReply();
                this.selectChannel(this.data.currentChannelId, document.getElementById('current-chat-channel').innerText);
            } else {
                window.alert("Lỗi khi gửi tin nhắn");
            }
        } catch(err) {
            window.alert("Mất kết nối");
        } finally {
            input.disabled = false;
            input.focus();
        }
    },

    // --- WELCOME EMBED PREVIEW ---
    updateEmbedPreview() {
        const title = document.getElementById('em-title').value || 'Tiêu đề trống';
        const desc = document.getElementById('em-desc').value || 'Mô tả trống';
        const color = document.getElementById('em-color').value || '#2B2D31';
        const img = document.getElementById('em-image').value;
        
        document.getElementById('pv-title').innerText = title;
        document.getElementById('pv-desc').innerText = desc;
        document.getElementById('pv-color').style.backgroundColor = color;
        
        const imgEl = document.getElementById('pv-img');
        if(img) {
            imgEl.src = img;
            imgEl.style.display = 'block';
        } else {
            imgEl.style.display = 'none';
        }
    },

    // --- TRẠNG THÁI BOT ---
    async updateBotStatus() {
        const status = document.getElementById('bot-status-select').value;
        const activityType = document.getElementById('bot-act-type').value;
        const activityName = document.getElementById('bot-act-name').value.trim();

        try {
            const res = await fetch('/api/bot/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: status,
                    activity_type: activityType,
                    activity_name: activityName
                })
            });
            const data = await res.json();
            if(data.success) {
                window.alert("Đã cập nhật trạng thái thành công!");
            } else {
                window.alert("Lỗi: " + data.error);
            }
        } catch(e) { window.alert("Lỗi kết nối"); }
    },

    // --- LOGS ---
    logInterval: null,
    startLogPolling() {
        if(this.logInterval) clearInterval(this.logInterval);
        this.logInterval = setInterval(async () => {
            try {
                const res = await fetch('/api/logs');
                if(!res.ok) return;
                const logs = await res.json();
                const container = document.getElementById('log-container');
                
                if(logs.length === 0) {
                    container.innerHTML = '<div class="text-gray-500">[System] Đang chờ dữ liệu log...</div>';
                    return;
                }

                container.innerHTML = logs.map(l => {
                    let color = 'text-gray-300';
                    if(l.level === 'warn') color = 'text-yellow-400';
                    if(l.level === 'error') color = 'text-red-400';
                    return `<div class="${color}">[${l.time}] ${l.msg}</div>`;
                }).join('');
                
                container.scrollTop = container.scrollHeight;
            } catch(e) {}
        }, 2000); 
    },

    clearLogs() {
        document.getElementById('log-container').innerHTML = '<div class="text-indigo-400">[System] Logs cleared (UI only).</div>';
    },

    // --- UTILITIES ---
    openModal(modalId) {
        document.getElementById('modal-backdrop').classList.remove('hidden-tab');
        document.getElementById(modalId).classList.remove('hidden-tab');
    },
    
    closeAllModals() {
        document.getElementById('modal-backdrop').classList.add('hidden-tab');
        document.querySelectorAll('div[id$="Modal"]').forEach(m => m.classList.add('hidden-tab'));
        this.data.actionTarget = null;
    },

    copyText(text) {
        navigator.clipboard.writeText(text).then(() => {
            window.alert("Đã sao chép link!");
        }).catch(() => {
            const temp = document.createElement("input");
            document.body.appendChild(temp);
            temp.value = text;
            temp.select();
            document.execCommand("copy");
            document.body.removeChild(temp);
            window.alert("Đã sao chép link!");
        });
    }
};

// Custom alert (Toast)
window.alert = function(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-[100] transform transition-all translate-y-10 opacity-0';
    toast.innerHTML = `<i class="ph-fill ph-check-circle text-green-400 text-xl"></i> <span>${message}</span>`;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.remove('translate-y-10', 'opacity-0'), 10);
    setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

// Khởi động panel khi tải trang xong
window.app = app;
app.init();