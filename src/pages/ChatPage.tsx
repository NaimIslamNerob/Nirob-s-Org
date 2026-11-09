import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { ChatMessage, ConversationSummary } from '../types';
import { api } from '../lib/api';
import { socket } from '../lib/socket';
import { sounds } from '../lib/sounds';
import {
  Send,
  MessageSquare,
  Check,
  CheckCheck,
  User,
  Shield,
  Search,
  Lock,
  Clock,
  LogIn,
  Crown,
  Trash2,
  AlertTriangle,
  X,
  Database,
  HardDrive,
} from 'lucide-react';

export const ChatPage: React.FC = () => {
  const { user, isAdmin, isNirofyOnline, openAuthModal } = useAuth();

  // For Admin: list of conversations and selected guest
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Messages state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<any>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Storage & Deletion modals state
  const [conversationToDelete, setConversationToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [purgeAllModalOpen, setPurgeAllModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Determine current active chat partner ID
  const activeRecipientId = isAdmin ? selectedGuestId : 'admin';

  const showStatus = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => setStatusBanner(null), 4000);
  };

  // Load conversations list for admin
  const loadConversations = async () => {
    if (!isAdmin) return;
    try {
      const list = await api.getConversations();
      setConversations(list);
      if (!selectedGuestId && list.length > 0) {
        setSelectedGuestId(list[0].userId);
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
    }
  };

  // Load message history for current active recipient
  const loadMessages = async (recipientId: string) => {
    try {
      const data = await api.getMessages(recipientId);
      setMessages(data);
      scrollToBottom();
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  // Auto-scroll helper
  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
      }
    }, 50);
  };

  // Initial load
  useEffect(() => {
    if (!user) return;
    if (isAdmin) {
      loadConversations();
    } else {
      loadMessages('admin');
    }
  }, [user, isAdmin]);

  // When selectedGuestId changes for Admin
  useEffect(() => {
    if (isAdmin && selectedGuestId) {
      loadMessages(selectedGuestId);
    }
  }, [isAdmin, selectedGuestId]);

  // WebSocket listeners
  useEffect(() => {
    if (!user) return;

    // Receive new message
    const unsubMessage = socket.on('message:new', (newMsg: ChatMessage) => {
      const belongs =
        (newMsg.senderId === user.id && newMsg.recipientId === activeRecipientId) ||
        (newMsg.senderId === activeRecipientId && newMsg.recipientId === user.id);

      if (belongs) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        scrollToBottom();
        if (newMsg.senderId !== user.id) {
          sounds.playMessagePop();
        }
      }

      if (isAdmin) {
        loadConversations();
      }
    });

    // Message deleted
    const unsubDeleted = socket.on('message:deleted', (data: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
      if (isAdmin) {
        loadConversations();
      }
    });

    // Entire conversation cleared
    const unsubCleared = socket.on(
      'conversation:cleared',
      (data: { otherUserId: string }) => {
        if (data.otherUserId === activeRecipientId || data.otherUserId === user.id) {
          setMessages([]);
        }
        if (isAdmin) {
          loadConversations();
        }
      }
    );

    // All messages purged
    const unsubPurged = socket.on('messages:purged', () => {
      setMessages([]);
      if (isAdmin) {
        loadConversations();
      }
    });

    // Typing status
    const unsubTyping = socket.on(
      'typing:status',
      (data: { userId: string; isTyping: boolean }) => {
        if (data.userId === activeRecipientId) {
          setOtherUserTyping(data.isTyping);
        }
      }
    );

    // Read status update
    const unsubRead = socket.on('messages:read', (data: { byUserId: string }) => {
      if (data.byUserId === activeRecipientId) {
        setMessages((prev) =>
          prev.map((m) => (m.senderId === user.id ? { ...m, status: 'read' } : m))
        );
      }
    });

    return () => {
      unsubMessage();
      unsubDeleted();
      unsubCleared();
      unsubPurged();
      unsubTyping();
      unsubRead();
    };
  }, [user, activeRecipientId, isAdmin]);

  // Handle typing input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!activeRecipientId) return;

    socket.startTyping(activeRecipientId);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.stopTyping(activeRecipientId);
    }, 1500);
  };

  // Send message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeRecipientId || sending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);
    socket.stopTyping(activeRecipientId);

    setSendError(null);
    try {
      const newMsg = await api.sendMessage(activeRecipientId, textToSend);
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      sounds.playMove();
      scrollToBottom();
      if (isAdmin) {
        loadConversations();
      }
    } catch (err: any) {
      setSendError(err.message || 'Failed to send message');
      setTimeout(() => setSendError(null), 5000);
      setInputText(textToSend);
    } finally {
      setSending(false);
    }
  };

  // Delete individual message
  const handleDeleteSingleMessage = async (messageId: string) => {
    try {
      await api.deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      showStatus('Message deleted to free storage.');
      if (isAdmin) loadConversations();
    } catch (err: any) {
      setSendError(err.message || 'Failed to delete message');
      setTimeout(() => setSendError(null), 5000);
    }
  };

  // Confirm delete conversation
  const confirmDeleteConversation = async () => {
    if (!conversationToDelete) return;
    const targetId = conversationToDelete.id;
    const targetName = conversationToDelete.name;
    setActionLoading(true);
    try {
      const res = await api.deleteConversation(targetId);
      if (targetId === activeRecipientId) {
        setMessages([]);
      }
      setConversationToDelete(null);
      showStatus(`Deleted chat history with ${targetName}. Storage freed!`);
      if (isAdmin) loadConversations();
    } catch (err: any) {
      setSendError(err.message || 'Failed to delete conversation');
      setTimeout(() => setSendError(null), 5000);
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm purge all platform messages (Admin)
  const confirmPurgeAllMessages = async () => {
    setActionLoading(true);
    try {
      const res = await api.purgeAllMessages();
      setMessages([]);
      setPurgeAllModalOpen(false);
      showStatus(`Purged all ${res.count} messages platform-wide. Maximum storage freed!`);
      if (isAdmin) loadConversations();
    } catch (err: any) {
      setSendError(err.message || 'Failed to purge messages');
      setTimeout(() => setSendError(null), 5000);
    } finally {
      setActionLoading(false);
    }
  };

  // If not logged in
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded-3xl bg-slate-900/80 border border-slate-800 text-center space-y-6 shadow-2xl backdrop-blur-xl">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
          <MessageSquare className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Private Direct Messaging</h2>
          <p className="text-sm text-slate-300 max-w-md mx-auto">
            Log in or create a guest account to message Nirofy directly. Your conversation history, messages, and presence will be saved securely.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => openAuthModal('guest-login')}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-slate-950 font-semibold text-sm shadow-lg shadow-sky-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In / Create Guest Account</span>
          </button>
          <button
            onClick={() => openAuthModal('admin-login')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold text-sm border border-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Shield className="w-4 h-4" />
            <span>Admin Login</span>
          </button>
        </div>
      </div>
    );
  }

  // Active recipient metadata for header
  const currentConversation = isAdmin
    ? conversations.find((c) => c.userId === selectedGuestId)
    : null;

  const recipientName = isAdmin
    ? currentConversation?.username || 'Guest'
    : 'Naim Islam Nerob (Nirofy)';

  const recipientIsOnline = isAdmin ? currentConversation?.isOnline : isNirofyOnline;

  const filteredConversations = conversations.filter(
    (c) =>
      c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-3">
      {/* Status banner */}
      {statusBanner && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-600/80 text-emerald-300 text-xs flex items-center justify-between shadow-xl animate-fade-in">
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{statusBanner}</span>
          </span>
          <button
            onClick={() => setStatusBanner(null)}
            className="text-emerald-400 hover:text-white px-1.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[78vh] min-h-[550px]">
        {/* Admin Left Inbox Pane */}
        {isAdmin && (
          <aside className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col bg-slate-950/60">
            {/* Inbox Header */}
            <div className="p-4 border-b border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-sky-400" />
                  <span className="font-bold text-sm text-white">Guest Messages</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    {conversations.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPurgeAllModalOpen(true)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-850 cursor-pointer transition-colors"
                    title="Purge all chats across system to free storage"
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search guest user..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
              {filteredConversations.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No guest conversations found.
                </div>
              ) : (
                filteredConversations.map((c) => {
                  const isSelected = selectedGuestId === c.userId;
                  return (
                    <div
                      key={c.userId}
                      className={`group/item w-full p-3.5 flex items-start gap-3 text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-sky-500/15 border-l-4 border-sky-400'
                          : 'hover:bg-slate-900/60'
                      }`}
                      onClick={() => setSelectedGuestId(c.userId)}
                    >
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-700 to-indigo-700 flex items-center justify-center font-bold text-xs text-white uppercase">
                          {c.username.charAt(0)}
                        </div>
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-slate-950 ${
                            c.isOnline ? 'bg-emerald-400' : 'bg-slate-600'
                          }`}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-semibold text-xs text-slate-200 truncate">
                            {c.username}
                          </span>
                          {c.lastMessage && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(c.lastMessage.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {c.lastMessage?.text || 'No messages yet'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {c.unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-sky-500 text-slate-950 font-bold text-[10px]">
                            {c.unreadCount}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConversationToDelete({ id: c.userId, name: c.username });
                          }}
                          className="opacity-0 group-hover/item:opacity-100 p-1 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-opacity"
                          title="Delete this chat to free storage"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        )}

        {/* Right / Main Chat Area */}
        <div className="flex-1 flex flex-col bg-slate-900/40">
          {/* Chat Header */}
          <div className="p-4 border-b border-slate-800/80 bg-slate-950/70 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white text-sm shadow-md">
                  {isAdmin ? recipientName.charAt(0).toUpperCase() : <Crown className="w-5 h-5 text-amber-300" />}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-slate-950 ${
                    recipientIsOnline ? 'bg-emerald-400' : 'bg-slate-500'
                  }`}
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-bold text-sm text-white truncate">{recipientName}</h3>
                  {!isAdmin && (
                    <span className="px-2 py-0.2 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-semibold">
                      Admin
                    </span>
                  )}
                </div>
                <div className="text-[11px] flex items-center gap-1.5 text-slate-400">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      recipientIsOnline ? 'bg-emerald-400' : 'bg-slate-500'
                    }`}
                  />
                  <span>
                    {recipientIsOnline
                      ? 'Active now'
                      : !isAdmin
                      ? 'Offline'
                      : currentConversation?.lastSeen
                      ? `Last active ${new Date(currentConversation.lastSeen).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`
                      : 'Offline'}
                  </span>
                </div>
              </div>
            </div>

            {/* Header Actions: Delete Chat to free storage */}
            <div className="flex items-center gap-2 text-xs">
              <span className="hidden sm:inline-block px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 font-mono">
                {messages.length} msgs
              </span>

              {/* DELETE CONVERSATION BUTTON */}
              {activeRecipientId && (
                <button
                  type="button"
                  onClick={() =>
                    setConversationToDelete({
                      id: activeRecipientId,
                      name: recipientName,
                    })
                  }
                  className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  title="Delete entire chat history to free storage"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden sm:inline">Delete Chat</span>
                </button>
              )}
            </div>
          </div>

          {/* Message Thread */}
          <div
            ref={chatScrollRef}
            className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3.5 scrollbar-thin"
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-600" />
                <p className="text-xs">No messages in this chat.</p>
                <p className="text-[11px] text-slate-500">
                  Storage is clear. Type a message below to start chatting!
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === user.id;
                const canDelete = isMe || isAdmin;
                return (
                  <div
                    key={msg.id}
                    className={`group/msg flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 max-w-[85%] sm:max-w-md">
                      {/* Delete icon on left for incoming messages if admin */}
                      {!isMe && canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSingleMessage(msg.id)}
                          className="opacity-0 group-hover/msg:opacity-100 p-1 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-opacity"
                          title="Delete message to free storage"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <div
                        className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-md break-words ${
                          isMe
                            ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-slate-950 font-medium rounded-br-xs'
                            : 'bg-slate-800/90 text-slate-100 border border-slate-700/60 rounded-bl-xs'
                        }`}
                      >
                        {msg.text}
                      </div>

                      {/* Delete icon on right for sent messages */}
                      {isMe && canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSingleMessage(msg.id)}
                          className="opacity-0 group-hover/msg:opacity-100 p-1 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-opacity cursor-pointer"
                          title="Delete message to free storage"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Metadata & Status */}
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-1 px-1">
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {isMe && (
                        <span title={msg.status === 'read' ? 'Read' : msg.status === 'delivered' ? 'Delivered' : 'Sent'}>
                          {msg.status === 'read' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                          ) : msg.status === 'delivered' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-slate-500" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing Indicator */}
            {otherUserTyping && (
              <div className="flex items-center gap-2 text-slate-400 text-xs py-1">
                <div className="flex items-center gap-1 bg-slate-800/70 border border-slate-700/50 px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce"
                    style={{ animationDelay: '0.15s' }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce"
                    style={{ animationDelay: '0.3s' }}
                  />
                  <span className="text-[11px] text-slate-400 ml-1 font-mono">typing...</span>
                </div>
              </div>
            )}
          </div>

          {/* Send Input Bar */}
          <form
            onSubmit={handleSend}
            className="p-3 sm:p-4 border-t border-slate-800/80 bg-slate-950/80 flex items-center gap-2 sm:gap-3"
          >
            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              placeholder={`Message ${recipientName}...`}
              className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="p-2.5 sm:px-5 sm:py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-sky-600/20 disabled:opacity-40 transition-all active:scale-95 shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </div>

      {/* 1. DELETE CONVERSATION CONFIRMATION MODAL */}
      {conversationToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
                <Trash2 className="w-5 h-5" />
                <span>Delete Chat History?</span>
              </div>
              <button
                type="button"
                onClick={() => setConversationToDelete(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-slate-200">
                Are you sure you want to permanently delete all messages in your conversation with{' '}
                <strong className="text-white">{conversationToDelete.name}</strong>?
              </p>
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                This will delete the messages from storage immediately and cannot be undone.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConversationToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteConversation}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-600/30 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{actionLoading ? 'Deleting...' : 'Permanently Delete Chat'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. PURGE ALL CHATS MODAL (ADMIN ONLY) */}
      {purgeAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span>Purge All Chats System-Wide</span>
              </div>
              <button
                type="button"
                onClick={() => setPurgeAllModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-slate-200">
                Are you sure you want to delete <strong className="text-rose-400">ALL</strong> chat messages across the entire platform?
              </p>
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                This will wipe all historical message databases to free up maximum server storage.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPurgeAllModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPurgeAllMessages}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-600/30 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{actionLoading ? 'Purging...' : 'Purge All Chats'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
