import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import api from '../lib/api';
import {
  Type,
  Image,
  Square,
  LayoutGrid,
  Columns,
  Monitor,
  Smartphone,
  Undo2,
  Redo2,
  Search,
  Settings,
  Trash2,
  Copy,
  Plus,
  Upload,
  Sparkles,
  Mail,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';

import {
  DndContext,
  closestCenter,
} from '@dnd-kit/core';

import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';

import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

const blockGroups = [
  {
    title: 'Basic Blocks',
    items: [
      { type: 'text', label: 'Text', icon: <Type /> },
      { type: 'heading', label: 'Heading', icon: <Type /> },
      { type: 'image', label: 'Image', icon: <Image /> },
      { type: 'button', label: 'Button', icon: <Square /> },
      { type: 'html', label: 'HTML', icon: <Type /> },
      { type: 'divider', label: 'Divider', icon: <LayoutGrid /> },
      { type: 'spacer', label: 'Spacer', icon: <Upload /> },
    ],
  },
  {
    title: 'Advanced Blocks',
    items: [
      { type: 'hero', label: 'Hero', icon: <Sparkles /> },
      { type: 'footer', label: 'Footer', icon: <Mail /> },
      { type: 'cta', label: 'CTA Banner', icon: <LayoutGrid /> },
      { type: 'social', label: 'Social Links', icon: <Columns /> },
      { type: 'content', label: 'Content Zone', icon: <Type /> },
      { type: 'userInfo', label: 'User Info', icon: <Type /> },
      { type: 'receipt', label: 'Receipt', icon: <Image /> },
    ],
  },
  {
    title: 'Layout Blocks',
    items: [
      { type: 'oneColumn', label: '1 Column', icon: <Columns /> },
      { type: 'twoColumns', label: '2 Columns', icon: <Columns /> },
      { type: 'threeColumns', label: '3 Columns', icon: <Columns /> },
      { type: 'hero', label: 'Hero Section', icon: <Sparkles /> },
      { type: 'featureRow', label: 'Feature', icon: <Type /> },
      { type: 'footer', label: 'Footer', icon: <Mail /> },
    ],
  },
];

const dynamicVariables = [
  '{{customer_name}}',
  '{{email}}',
  '{{campaign_name}}',
  '{{amount}}',
  '{{payment_date}}',
  '{{donation_link}}',
  '{{content}}',
];

const initialSections = [
  {
    id: 1,
    type: 'hero',
    heading: 'Thank you for supporting our mission!',
    content:
      'Your contribution helps us bring positive change to communities in need.',
    buttonText: 'See Your Impact',
    align: 'center',
    textColor: '#0F172A',
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 1.2,
    padding: { top: 40, right: 40, bottom: 40, left: 40 },
  },
  {
    id: 2,
    type: 'featureRow',
    title: "Here's what your support makes possible:",
    cards: [
      {
        title: 'Empower People',
        description: 'We provide resources that help people build better futures.',
      },
      {
        title: 'Educate Children',
        description: 'We support education initiatives for children in underserved areas.',
      },
      {
        title: 'Build Communities',
        description: 'We work together to build stronger, healthier communities.',
      },
    ],
  },
  {
    id: 3,
    type: 'footer',
    company: 'HopeForAll',
    email: 'support@hopeforall.com',
    year: new Date().getFullYear(),
    address: '123 Hope Street, Dream City',
  },
];

const defaultSettings = {
  canvasWidth: 720,
  background: '#F8FAFC',
  previewMode: 'desktop',
};

export default function TemplateDesigner() {
  const [activeTab, setActiveTab] = useState('content');
  const [sections, setSections] = useState(initialSections);
  const [selectedSectionId, setSelectedSectionId] = useState(initialSections[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState(defaultSettings);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [templateId, setTemplateId] = useState(null);
  const [templateName, setTemplateName] = useState('Welcome Email Template');
  const [subject, setSubject] = useState('Thanks for joining our community');
  const [category, setCategory] = useState('Onboarding');
  const [previewText, setPreviewText] = useState('A short preview text to appear in inboxes.');
  const [status, setStatus] = useState('draft');
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [testSendHtml, setTestSendHtml] = useState('');
  const [showTestSend, setShowTestSend] = useState(false);
  const [useCompleteHtml, setUseCompleteHtml] = useState(false);
  const [completeHtml, setCompleteHtml] = useState('');
  const [fullHtmlStyle, setFullHtmlStyle] = useState({
    background: '#ffffff',
    textColor: '#0F172A',
    fontSize: 16,
    lineHeight: 1.5,
    align: 'left',
    padding: 24,
  });

  const addToast = useStore((state) => state.addToast);
  const addTemplate = useStore((state) => state.addTemplate);
  const updateTemplate = useStore((state) => state.updateTemplate);

  const selectedSectionIndex = sections.findIndex(
    (section) => section.id === selectedSectionId
  );
  const selectedSection = sections[selectedSectionIndex] || null;

  const canvasWidth = settings.previewMode === 'mobile' ? 360 : settings.canvasWidth;

  const filteredBlockGroups = useMemo(() => {
    if (!searchQuery.trim()) return blockGroups;
    const query = searchQuery.toLowerCase();
    return blockGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.label.toLowerCase().includes(query)),
      }))
      .filter((group) => group.items.length > 0);
  }, [searchQuery]);

  const pushHistory = (prevSections) => {
    setHistory((prev) => [...prev, prevSections]);
    setFuture([]);
  };

  const updateSections = (updater) => {
    setSections((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next === prev) return prev;
      pushHistory(prev);
      return next;
    });
  };

  const getFullHtmlDocument = () => {
    const html = String(completeHtml || '').trim();
    if (!html) return '';
    if (/^<!doctype|<html/i.test(html)) {
      return html;
    }

    return `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><style>body{margin:0;padding:${fullHtmlStyle.padding}px;background:${fullHtmlStyle.background};color:${fullHtmlStyle.textColor};font-size:${fullHtmlStyle.fontSize}px;line-height:${fullHtmlStyle.lineHeight};text-align:${fullHtmlStyle.align};}</style></head><body>${html}</body></html>`;
  };

  const addSection = (type) => {
    const nextId = Date.now();
    const newSection = {
      id: nextId,
      type,
      heading: type === 'heading' ? 'New heading' : '',
      content:
        type === 'text'
          ? 'New text block. Add your message here.'
          : type === 'button'
          ? 'Click Me'
          : type === 'hero'
          ? 'Your contribution helps us bring positive change to communities in need.'
          : type === 'footer'
          ? 'Use the footer section to add contact information and links.'
          : type === 'html'
          ? '<p>Paste your HTML code here.</p>'
          : '',
      buttonText: type === 'button' ? 'Call to action' : 'Learn more',
      align: 'left',
      textColor: '#0F172A',
      fontSize: 18,
      fontWeight: 'medium',
      lineHeight: 1.5,
      padding: { top: 24, right: 24, bottom: 24, left: 24 },
      cards:
        type === 'featureRow'
          ? [
              {
                title: 'Feature One',
                description: 'Describe the first key benefit of your campaign.',
              },
              {
                title: 'Feature Two',
                description: 'Explain how this helps your recipients.',
              },
              {
                title: 'Feature Three',
                description: 'Show why this is important and compelling.',
              },
            ]
          : [],
      image: '',
    };
    updateSections((prev) => [...prev, newSection]);
    setSelectedSectionId(nextId);
  };

  const updateSection = (id, updates) => {
    updateSections((prev) => prev.map((section) => (section.id === id ? { ...section, ...updates } : section)));
  };

  const deleteSection = (id) => {
    updateSections((prev) => {
      const next = prev.filter((section) => section.id !== id);
      if (selectedSectionId === id) {
        setSelectedSectionId(next[0]?.id || null);
      }
      return next;
    });
  };

  const duplicateSection = (id) => {
    updateSections((prev) => {
      const index = prev.findIndex((section) => section.id === id);
      if (index === -1) return prev;
      const duplicated = { ...prev[index], id: Date.now() };
      const next = [...prev];
      next.splice(index + 1, 0, duplicated);
      return next;
    });
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((section) => section.id === active.id);
    const newIndex = sections.findIndex((section) => section.id === over.id);
    updateSections((items) => arrayMove(items, oldIndex, newIndex));
  };

  const insertVariable = (variable) => {
    if (!selectedSection) return;
    const targetField = selectedSection.type === 'button' ? 'buttonText' : 'content';
    updateSection(selectedSection.id, {
      [targetField]: `${selectedSection[targetField] || ''} ${variable}`.trim(),
    });
  };

  const escapeHtml = (value) =>
    String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const renderSectionHtml = (section) => {
    const padding = section.padding || { top: 24, right: 24, bottom: 24, left: 24 };
    const sectionStyle = `padding:${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px; text-align:${section.align || 'left'}; color:${section.textColor || '#0F172A'}; font-size:${section.fontSize || 18}px; line-height:${section.lineHeight || 1.5};`;

    switch (section.type) {
      case 'hero':
        return `<section style="${sectionStyle} background:#f8fafc; border-radius:28px; margin-bottom:28px;"><div style="max-width:720px; margin:0 auto;"><p style="margin:0 0 12px; font-size:12px; letter-spacing:.2em; text-transform:uppercase; color:#6366f1;">Hi ${escapeHtml('{{customer_name}}')},</p><h1 style="margin:0 0 16px; font-size:32px; font-weight:700;">${escapeHtml(section.heading)}</h1><p style="margin:0 0 24px;">${escapeHtml(section.content)}</p><a href="#" style="display:inline-block; padding:14px 28px; border-radius:999px; background:#4f46e5; color:#fff; text-decoration:none;">${escapeHtml(section.buttonText)}</a></div></section>`;
      case 'featureRow':
        return `<section style="${sectionStyle} background:#ffffff; border-radius:28px; margin-bottom:28px;"><div style="max-width:720px; margin:0 auto;"><h2 style="margin:0 0 24px; font-size:24px; font-weight:700;">${escapeHtml(section.title)}</h2><div style="display:flex; flex-wrap:wrap; gap:16px;">${section.cards
          .map(
            (card) =>
              `<div style="flex:1 1 calc(33.333% - 16px); min-width:220px; background:#f8fafc; border-radius:24px; padding:20px;"><h3 style="margin:0 0 12px; font-size:18px;">${escapeHtml(card.title)}</h3><p style="margin:0; color:#475569;">${escapeHtml(card.description)}</p></div>`
          )
          .join('')}</div></div></section>`;
      case 'footer':
        return `<section style="${sectionStyle} background:#f8fafc; border-radius:28px; margin-bottom:28px; color:#475569;"><div style="max-width:720px; margin:0 auto; display:flex; flex-wrap:wrap; justify-content:space-between; gap:16px;"><div><p style="margin:0 0 8px; font-weight:700; color:#0f172a;">${escapeHtml(section.company)}</p><p style="margin:0 0 4px;">${escapeHtml(section.address)}</p><p style="margin:0;">${escapeHtml(section.email)}</p></div><p style="margin:0;">${escapeHtml(section.year)} © ${escapeHtml(section.company)}. All rights reserved.</p></div></section>`;
      case 'html':
        return `<section style="${sectionStyle}">${section.content || ''}</section>`;
      case 'heading':
        return `<section style="${sectionStyle} margin-bottom:28px;"><h2 style="margin:0; font-size:28px; font-weight:700;">${escapeHtml(section.heading)}</h2></section>`;
      case 'content':
        return `<div class="content-zone" style="${sectionStyle} border:2px dashed #cbd5e1; border-radius:12px; background:#f1f5f9; min-height:200px;">{{content}}</div>`;
      case 'button':
        return `<section style="${sectionStyle} margin-bottom:28px;"><a href="#" style="display:inline-block; padding:14px 28px; border-radius:999px; background:#4f46e5; color:#fff; text-decoration:none;">${escapeHtml(section.buttonText)}</a></section>`;
      case 'image':
        return `<section style="${sectionStyle} margin-bottom:28px;"><div style="width:100%; min-height:240px; background:#e2e8f0; display:flex; align-items:center; justify-content:center; color:#64748b;">Image Placeholder</div></section>`;
      case 'divider':
        return `<section style="${sectionStyle} margin-bottom:28px;"><hr style="border:none; height:1px; background:#e2e8f0;" /></section>`;
      case 'spacer':
        return `<section style="${sectionStyle} margin-bottom:28px;"><div style="height:48px;"></div></section>`;
      case 'oneColumn':
        return `<section style="${sectionStyle} margin-bottom:28px;"><div style="background:#f8fafc; border-radius:24px; padding:24px;">1 Column layout block</div></section>`;
      case 'twoColumns':
        return `<section style="${sectionStyle} margin-bottom:28px; display:flex; gap:16px; flex-wrap:wrap;"><div style="flex:1 1 45%; background:#f8fafc; border-radius:24px; padding:24px;">Column 1</div><div style="flex:1 1 45%; background:#f8fafc; border-radius:24px; padding:24px;">Column 2</div></section>`;
      case 'threeColumns':
        return `<section style="${sectionStyle} margin-bottom:28px; display:flex; gap:16px; flex-wrap:wrap;"><div style="flex:1 1 30%; background:#f8fafc; border-radius:24px; padding:24px;">Column 1</div><div style="flex:1 1 30%; background:#f8fafc; border-radius:24px; padding:24px;">Column 2</div><div style="flex:1 1 30%; background:#f8fafc; border-radius:24px; padding:24px;">Column 3</div></section>`;
      default:
        return `<section style="${sectionStyle} margin-bottom:28px;"><p>${escapeHtml(section.content || '')}</p></section>`;
    }
  };

  const generateHtmlContent = () => {
    if (useCompleteHtml && completeHtml.trim()) {
      return getFullHtmlDocument();
    }

    return `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(templateName)}</title></head><body style="margin:0; padding:24px; background:#f8fafc; font-family:Inter, system-ui, sans-serif;">${sections.map(renderSectionHtml).join('')}</body></html>`;
  };

  const mapTemplateForStore = (template) => ({
    id: template.id || `t-${Date.now()}`,
    name: template.template_name || template.name || 'Untitled Template',
    category: template.category || category || 'Newsletter',
    description: template.description || template.preview_text || template.subject || '',
    avgOpenRate: template.avg_open_rate || '-',
    color: template.color || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  });

  const saveTemplate = async (newStatus = 'draft') => {
    try {
      setSaving(true);
      const htmlContent = generateHtmlContent();
      const payload = {
        template_name: templateName,
        slug: templateName.toLowerCase().replace(/\s+/g, '-'),
        category,
        subject,
        preview_text: previewText,
        html_content: htmlContent,
        json_design: sections,
        status: newStatus,
      };
      const response = templateId
        ? await api.patch(`/email-templates/${templateId}`, payload)
        : await api.post('/email-templates', payload);
      const data = response.data;
      setTemplateId(data.id);
      setStatus(data.status || newStatus);
      const storeTemplate = mapTemplateForStore(data);
      if (templateId) {
        updateTemplate(data.id, storeTemplate);
      } else {
        addTemplate(storeTemplate);
      }
      addToast(`Template ${newStatus === 'published' ? 'published' : 'saved'} successfully`, 'success');
      return data;
    } catch (error) {
      console.error(error);
      addToast(error.response?.data?.message || 'Failed to save template', 'error');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const previewTemplate = async () => {
    const html = generateHtmlContent();
    setPreviewHtml(html);
    setShowPreview(true);
  };

  const sendTestTemplate = async () => {
    try {
      setSaving(true);
      let currentTemplateId = templateId;
      if (!currentTemplateId) {
        const result = await saveTemplate('draft');
        currentTemplateId = result?.id;
      }
      if (!currentTemplateId) {
        return;
      }

      const response = await api.post(`/email-templates/${currentTemplateId}/test-send`, {
        variables: {
          customer_name: 'Test User',
          email: 'test@example.com',
          campaign_name: 'Sample Campaign',
        },
      });

      setTestSendHtml(response.data.preview || '');
      setShowTestSend(true);
    } catch (error) {
      console.error(error);
      addToast(error.response?.data?.message || 'Failed to send test preview', 'error');
    } finally {
      setSaving(false);
    }
  };

  const publishTemplate = async () => {
    await saveTemplate('published');
  };

  const closeModal = () => {
    setShowPreview(false);
    setShowTestSend(false);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setFuture((prev) => [sections, ...prev]);
    setSections(previous);
    setSelectedSectionId(previous[0]?.id || null);
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((prev) => prev.slice(1));
    setHistory((prev) => [...prev, sections]);
    setSections(next);
    setSelectedSectionId(next[0]?.id || null);
  };

  return (
    <div className="h-screen flex bg-[#F8FAFC] overflow-hidden">
      <aside className="w-[290px] bg-[#0F172A] text-white flex flex-col border-r border-slate-800">
        <div className="h-20 px-6 flex items-center border-b border-slate-800">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg">
            <Mail className="w-5 h-5" />
          </div>
          <div className="ml-3">
            <h2 className="font-semibold text-lg">Email Designer</h2>
            <p className="text-xs text-slate-400">Drag & Drop Builder</p>
          </div>
        </div>

        <div className="p-5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search blocks..."
              className="w-full h-11 rounded-xl bg-slate-800 border border-slate-700 pl-10 pr-4 text-sm outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {filteredBlockGroups.map((group) => (
            <div className="mb-8" key={group.title}>
              <h3 className="text-xs uppercase tracking-wider text-slate-400 mb-4">{group.title}</h3>
              <div className="grid grid-cols-3 gap-3">
                {group.items.map((item) => (
                  <Block key={item.type} icon={item.icon} label={item.label} onClick={() => addSection(item.type)} />
                ))}
              </div>
            </div>
          ))}

          <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-5 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg mb-2">AI Assistant</h3>
            <p className="text-sm text-indigo-100 leading-6 mb-5">Generate beautiful email templates instantly using AI.</p>
            <button className="w-full h-11 rounded-xl bg-white text-indigo-600 font-medium hover:bg-slate-100 transition">Generate Template</button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="min-h-[5rem] bg-white border-b border-slate-200 px-8 py-4 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <Link to="/templates" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                ← Back to Templates
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row sm:items-end sm:gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700">Template title</label>
                  <input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
                    placeholder="Welcome Email Template"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700">Subject</label>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
                    placeholder="Thanks for joining our community"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Category</label>
                  <input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
                    placeholder="Onboarding"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Preview text</label>
                  <input
                    value={previewText}
                    onChange={(e) => setPreviewText(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500"
                    placeholder="A short preview text to appear in inboxes."
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => saveTemplate('draft')}
              disabled={saving}
              className={`h-11 px-5 rounded-xl border bg-white hover:bg-slate-50 text-sm font-medium ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
            <button
              type="button"
              onClick={previewTemplate}
              className="h-11 px-5 rounded-xl border bg-white hover:bg-slate-50 text-sm font-medium"
            >
              Preview
            </button>
            <button
              type="button"
              onClick={sendTestTemplate}
              disabled={saving}
              className={`h-11 px-5 rounded-xl border bg-white hover:bg-slate-50 text-sm font-medium ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {saving ? 'Sending…' : 'Send Test'}
            </button>
            <button
              type="button"
              onClick={publishTemplate}
              disabled={saving}
              className={`h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-lg shadow-indigo-500/20 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {saving ? 'Publishing…' : 'Publish'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-10 bg-[#F8FAFC]" style={{ background: settings.previewMode === 'mobile' ? '#f5f7fb' : '#F8FAFC' }}>
          <div className="mx-auto" style={{ maxWidth: '100%' }}>
            <div
              className="bg-white rounded-[28px] shadow-2xl border border-slate-200 overflow-hidden mx-auto"
              style={{ width: canvasWidth, background: settings.background }}
            >
              <div className="h-20 border-b border-slate-100 flex items-center justify-between px-10">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">HopeForAll</h3>
                    <p className="text-xs text-slate-500">support@hopeforall.com</p>
                  </div>
                </div>
                <button className="text-sm text-slate-500 hover:text-slate-700">View in browser</button>
              </div>

              {useCompleteHtml ? (
                <div className="p-10 bg-white">
                  {!completeHtml.trim() ? (
                    <div className="h-[500px] border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center text-center">
                      <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center mb-6">
                        <Plus className="w-10 h-10 text-indigo-600" />
                      </div>
                      <h3 className="text-2xl font-semibold text-slate-900">Paste full HTML here</h3>
                      <p className="text-slate-500 mt-3 max-w-md leading-7">Use the sidebar to paste your entire email HTML template and preview it here.</p>
                    </div>
                  ) : (
                    <iframe
                      title="Full HTML preview"
                      srcDoc={getFullHtmlDocument()}
                      className="w-full min-h-[700px] rounded-[28px] border border-slate-200"
                    />
                  )}
                </div>
              ) : (
                <div className="p-10 space-y-6 bg-white">
                  {sections.length === 0 && (
                    <div className="h-[500px] border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center text-center">
                      <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center mb-6">
                        <Plus className="w-10 h-10 text-indigo-600" />
                      </div>
                      <h3 className="text-2xl font-semibold text-slate-900">Start Building Your Email</h3>
                      <p className="text-slate-500 mt-3 max-w-md leading-7">Drag blocks from the left sidebar or click to add sections.</p>
                    </div>
                  )}

                  <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={sections.map((section) => section.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-6">
                        {sections.map((section) => (
                          <SortableSection
                            key={section.id}
                            section={section}
                            selectedSection={selectedSectionId}
                            setSelectedSection={setSelectedSectionId}
                            duplicateSection={duplicateSection}
                            deleteSection={deleteSection}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <aside className="w-[340px] bg-white border-l border-slate-200 flex flex-col">
        <div className="h-20 border-b border-slate-200 flex">
          <Tab active={activeTab === 'content'} label="Content" onClick={() => setActiveTab('content')} />
          <Tab active={activeTab === 'rows'} label="Rows" onClick={() => setActiveTab('rows')} />
          <Tab active={activeTab === 'settings'} label="Settings" onClick={() => setActiveTab('settings')} />
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'content' ? (
            <>
              <div className="rounded-2xl border border-slate-200 p-4 mb-6 bg-slate-50">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700">HTML Mode</p>
                    <p className="text-xs text-slate-500 mt-1">Switch between block editor and full HTML template mode.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseCompleteHtml((prev) => !prev)}
                    className={`h-11 rounded-xl px-4 text-sm font-medium transition ${
                      useCompleteHtml
                        ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {useCompleteHtml ? 'Use Blocks' : 'Use Full HTML'}
                  </button>
                </div>
              </div>

              {useCompleteHtml ? (
                <FullHtmlEditor
                  completeHtml={completeHtml}
                  setCompleteHtml={setCompleteHtml}
                  fullHtmlStyle={fullHtmlStyle}
                  setFullHtmlStyle={setFullHtmlStyle}
                />
              ) : selectedSection ? (
                <SectionEditor
                  section={selectedSection}
                  updateSection={updateSection}
                  insertVariable={insertVariable}
                  deleteSection={deleteSection}
                  duplicateSection={duplicateSection}
                />
              ) : (
                <div className="text-slate-500">Select a section to edit its content and properties.</div>
              )}
            </>
          ) : null}

          {activeTab === 'rows' ? (
            <div className="space-y-7">
              <div>
                <p className="text-sm font-medium text-slate-700">Add Rows</p>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {blockGroups[2].items.map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => addSection(item.type)}
                      className="rounded-2xl border border-slate-200 p-4 text-left hover:border-indigo-300 hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3 mb-2 text-slate-900">
                        {item.icon}
                        <span className="font-medium text-sm">{item.label}</span>
                      </div>
                      <p className="text-xs text-slate-500">Add a {item.label.toLowerCase()} block.</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm font-medium text-slate-700">Rows help structure your email.</p>
                <p className="text-sm text-slate-500 mt-3">Choose a layout block to build complex sections faster.</p>
              </div>
            </div>
          ) : null}

          {activeTab === 'settings' ? (
            <div className="space-y-7">
              <div>
                <p className="text-sm font-medium text-slate-700">Canvas Width</p>
                <div className="mt-4 flex items-center gap-3">
                  <input
                    type="range"
                    min={560}
                    max={900}
                    value={settings.canvasWidth}
                    onChange={(e) => setSettings({ ...settings, canvasWidth: Number(e.target.value) })}
                    className="w-full"
                  />
                  <span className="text-sm font-semibold text-slate-900">{settings.canvasWidth}px</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Background</label>
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.background}
                    onChange={(e) => setSettings({ ...settings, background: e.target.value })}
                    className="w-14 h-14 rounded-xl border border-slate-200 p-1"
                  />
                  <div>
                    <p className="font-medium text-slate-900">Page background</p>
                    <p className="text-sm text-slate-500">Change the canvas wrapper color.</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm font-medium text-slate-700">Preview</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, previewMode: 'desktop' })}
                    className={`h-12 rounded-xl border text-sm font-medium ${
                      settings.previewMode === 'desktop'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, previewMode: 'mobile' })}
                    className={`h-12 rounded-xl border text-sm font-medium ${
                      settings.previewMode === 'mobile'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Mobile
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </aside>
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="max-h-full w-full max-w-5xl overflow-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Preview HTML</h2>
                <p className="text-sm text-slate-500">Rendered email content for preview.</p>
              </div>
              <button
                onClick={closeModal}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <div className="p-6 bg-slate-50">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 overflow-auto text-sm text-slate-800">
                <pre className="whitespace-pre-wrap break-words">{previewHtml}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
      {showTestSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="max-h-full w-full max-w-5xl overflow-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Test Send Preview</h2>
                <p className="text-sm text-slate-500">Rendered preview from the backend test-send API.</p>
              </div>
              <button
                onClick={closeModal}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <div className="p-6 bg-slate-50">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 overflow-auto text-sm text-slate-800">
                <pre className="whitespace-pre-wrap break-words">{testSendHtml}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionEditor({ section, updateSection, insertVariable, deleteSection, duplicateSection }) {
  const fontWeights = ['light', 'regular', 'medium', 'bold'];
  const lineHeights = [1, 1.25, 1.5];

  const setValue = (key, value) => updateSection(section.id, { [key]: value });

  const sectionLabelMap = {
    hero: 'Hero section',
    featureRow: 'Feature row',
    footer: 'Footer',
    text: 'Text block',
    heading: 'Heading',
    button: 'Button',
    image: 'Image',
    html: 'HTML block',
    divider: 'Divider',
    spacer: 'Spacer',
    content: 'Content Zone',
    oneColumn: '1 Column',
    twoColumns: '2 Columns',
    threeColumns: '3 Columns',
  };

  return (
    <div className="space-y-7">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">Section Content</p>
            <p className="text-xs text-slate-400 mt-1">Edit the selected section.</p>
          </div>
          <span className="text-xs text-slate-500 uppercase tracking-[0.2em]">{sectionLabelMap[section.type] || section.type}</span>
        </div>

        <div className="mt-4 space-y-4">
          {section.type === 'hero' && (
            <>
              <InputField label="Heading" value={section.heading} onChange={(value) => setValue('heading', value)} />
              <TextareaField label="Subheading" value={section.content} onChange={(value) => setValue('content', value)} />
              <InputField label="Button label" value={section.buttonText} onChange={(value) => setValue('buttonText', value)} />
            </>
          )}

          {section.type === 'featureRow' && (
            <>
              <InputField label="Section title" value={section.title} onChange={(value) => setValue('title', value)} />
              {section.cards.map((card, index) => (
                <div key={index} className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm font-medium text-slate-700 mb-2">Card {index + 1}</p>
                  <InputField
                    label="Title"
                    value={card.title}
                    onChange={(value) => {
                      const cards = [...section.cards];
                      cards[index] = { ...cards[index], title: value };
                      setValue('cards', cards);
                    }}
                  />
                  <TextareaField
                    label="Description"
                    value={card.description}
                    onChange={(value) => {
                      const cards = [...section.cards];
                      cards[index] = { ...cards[index], description: value };
                      setValue('cards', cards);
                    }}
                  />
                </div>
              ))}
            </>
          )}

          {section.type === 'footer' && (
            <>
              <InputField label="Company name" value={section.company} onChange={(value) => setValue('company', value)} />
              <InputField label="Contact email" value={section.email} onChange={(value) => setValue('email', value)} />
              <InputField label="Address" value={section.address} onChange={(value) => setValue('address', value)} />
            </>
          )}

          {section.type === 'text' && (
            <TextareaField label="Text" value={section.content} onChange={(value) => setValue('content', value)} />
          )}

          {section.type === 'heading' && (
            <InputField label="Heading" value={section.heading} onChange={(value) => setValue('heading', value)} />
          )}

          {section.type === 'button' && (
            <InputField label="Button text" value={section.buttonText} onChange={(value) => setValue('buttonText', value)} />
          )}

          {section.type === 'image' && (
            <InputField label="Image URL" value={section.image || ''} onChange={(value) => setValue('image', value)} />
          )}

          {section.type === 'html' && (
            <TextareaField
              label="Raw HTML"
              value={section.content || ''}
              onChange={(value) => setValue('content', value)}
            />
          )}

          {section.type === 'content' && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1 flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-indigo-900">Campaign Content Zone</p>
                  <p className="text-xs text-indigo-700 mt-1">This placeholder will be replaced with campaign body content when sending emails. Campaign content will be injected here during email merging.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        {section.type !== 'content' && (
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">Text Styling</p>
              <p className="text-xs text-slate-400">Applies to this block</p>
            </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Text Color</label>
            <input
              type="color"
              value={section.textColor || '#0F172A'}
              onChange={(e) => setValue('textColor', e.target.value)}
              className="mt-3 w-full h-12 rounded-xl border border-slate-200 p-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Font Size</label>
            <input
              type="range"
              min={12}
              max={48}
              value={section.fontSize || 18}
              onChange={(e) => setValue('fontSize', Number(e.target.value))}
              className="w-full mt-3"
            />
            <div className="mt-2 text-sm text-slate-500">{section.fontSize || 18}px</div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Font Weight</label>
            <div className="grid grid-cols-4 gap-2 mt-3">
              {fontWeights.map((weight) => (
                <button
                  key={weight}
                  type="button"
                  onClick={() => setValue('fontWeight', weight)}
                  className={`h-11 rounded-xl border text-sm font-medium ${
                    section.fontWeight === weight
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {weight.charAt(0).toUpperCase() + weight.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Line Height</label>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {lineHeights.map((lineHeight) => (
                <button
                  key={lineHeight}
                  type="button"
                  onClick={() => setValue('lineHeight', lineHeight)}
                  className={`h-11 rounded-xl border text-sm font-medium ${
                    section.lineHeight === lineHeight
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {lineHeight}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Alignment</label>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <AlignButton icon={<AlignLeft />} active={section.align === 'left'} onClick={() => setValue('align', 'left')} />
              <AlignButton icon={<AlignCenter />} active={section.align === 'center'} onClick={() => setValue('align', 'center')} />
              <AlignButton icon={<AlignRight />} active={section.align === 'right'} onClick={() => setValue('align', 'right')} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Padding</label>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {['top', 'right', 'bottom', 'left'].map((side) => (
                <div key={side}>
                  <p className="text-xs uppercase text-slate-400 mb-2">{side}</p>
                  <input
                    type="number"
                    min={0}
                    value={section.padding?.[side] ?? 24}
                    onChange={(e) => setValue('padding', { ...section.padding, [side]: Number(e.target.value) })}
                    className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
            </div>
          )}
      </div>

      <div>
        <h3 className="font-semibold text-slate-900 mb-4">Dynamic Variables</h3>
        <div className="flex flex-wrap gap-3">
          {dynamicVariables.map((variable) => (
            <button
              key={variable}
              type="button"
              onClick={() => insertVariable(variable)}
              className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-sm font-medium"
            >
              {variable}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-6 border-t border-slate-100 space-y-4">
        <button
          type="button"
          className="w-full h-12 rounded-xl border hover:bg-slate-50 flex items-center justify-center gap-2"
        >
          <Settings className="w-4 h-4 text-slate-600" />
          Configure Section
        </button>
        <button
          type="button"
          onClick={() => duplicateSection(section.id)}
          className="w-full h-12 rounded-xl border hover:bg-slate-50 flex items-center justify-center gap-2"
        >
          <Copy className="w-4 h-4" />
          Duplicate Section
        </button>
        <button
          type="button"
          onClick={() => deleteSection(section.id)}
          className="w-full h-12 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete Section
        </button>
      </div>
    </div>
  );
}

function FullHtmlEditor({ completeHtml, setCompleteHtml, fullHtmlStyle, setFullHtmlStyle }) {
  const setStyleValue = (key, value) => setFullHtmlStyle((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-7">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">Complete HTML Template</p>
            <p className="text-xs text-slate-500 mt-1">Paste the entire email HTML here to bypass the block editor.</p>
          </div>
        </div>

        <TextareaField label="Complete HTML" value={completeHtml} onChange={setCompleteHtml} />
      </div>

      <div>
        <p className="text-sm font-medium text-slate-700">Template styling</p>
        <p className="text-xs text-slate-500 mt-1">These wrapper styles are applied when the pasted HTML is not a full document.</p>

        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Background</label>
              <input
                type="color"
                value={fullHtmlStyle.background}
                onChange={(e) => setStyleValue('background', e.target.value)}
                className="mt-3 w-full h-12 rounded-xl border border-slate-200 p-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Text Color</label>
              <input
                type="color"
                value={fullHtmlStyle.textColor}
                onChange={(e) => setStyleValue('textColor', e.target.value)}
                className="mt-3 w-full h-12 rounded-xl border border-slate-200 p-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Padding</label>
              <input
                type="number"
                min={0}
                value={fullHtmlStyle.padding}
                onChange={(e) => setStyleValue('padding', Number(e.target.value))}
                className="mt-3 w-full h-12 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Font Size</label>
              <input
                type="number"
                min={10}
                value={fullHtmlStyle.fontSize}
                onChange={(e) => setStyleValue('fontSize', Number(e.target.value))}
                className="mt-3 w-full h-12 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Line Height</label>
            <input
              type="number"
              min={1}
              step={0.1}
              value={fullHtmlStyle.lineHeight}
              onChange={(e) => setStyleValue('lineHeight', Number(e.target.value))}
              className="mt-3 w-full h-12 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Alignment</label>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <AlignButton icon={<AlignLeft />} active={fullHtmlStyle.align === 'left'} onClick={() => setStyleValue('align', 'left')} />
              <AlignButton icon={<AlignCenter />} active={fullHtmlStyle.align === 'center'} onClick={() => setStyleValue('align', 'center')} />
              <AlignButton icon={<AlignRight />} active={fullHtmlStyle.align === 'right'} onClick={() => setStyleValue('align', 'right')} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange }) {
  return (
    <label className="block space-y-2 text-sm text-slate-700">
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full h-12 rounded-xl border border-slate-200 px-4 outline-none focus:border-indigo-500"
      />
    </label>
  );
}

function TextareaField({ label, value, onChange }) {
  return (
    <label className="block space-y-2 text-sm text-slate-700">
      <span>{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full min-h-[120px] rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-500 resize-none"
      />
    </label>
  );
}

function Block({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-24 rounded-2xl bg-slate-800 hover:bg-indigo-600 transition-all duration-300 flex flex-col items-center justify-center gap-2 group"
    >
      <div className="text-slate-300 group-hover:text-white">{icon}</div>
      <span className="text-xs font-medium text-slate-300 group-hover:text-white">{label}</span>
    </button>
  );
}

function Tab({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 text-sm font-medium border-b-2 transition-all ${
        active ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'
      }`}
    >
      {label}
    </button>
  );
}

function AlignButton({ icon, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-12 rounded-xl border flex items-center justify-center ${
        active ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-200 hover:bg-slate-50'
      }`}
    >
      {icon}
    </button>
  );
}

function SortableSection({ section, selectedSection, setSelectedSection, duplicateSection, deleteSection }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const renderSection = () => {
    switch (section.type) {
      case 'hero':
        return (
          <div
            className="rounded-[28px] bg-slate-50 p-10 shadow-sm"
            style={{
              paddingTop: section.padding?.top,
              paddingRight: section.padding?.right,
              paddingBottom: section.padding?.bottom,
              paddingLeft: section.padding?.left,
            }}
          >
            <div className="max-w-2xl mx-auto" style={{ textAlign: section.align }}>
              <p className="text-sm uppercase tracking-[0.35em] text-indigo-600">Hi {'{{customer_name}}'},</p>
              <h2 className="text-3xl font-bold text-slate-900 mt-4">{section.heading}</h2>
              <p className="mt-3 text-base text-slate-600">{section.content}</p>
              <div className="mt-8 flex justify-center">
                <button className="rounded-2xl bg-indigo-600 px-8 py-3 text-white font-medium shadow-lg shadow-indigo-100">
                  {section.buttonText}
                </button>
              </div>
            </div>
          </div>
        );
      case 'featureRow':
        return (
          <div className="rounded-[28px] bg-slate-50 p-10 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 mb-8">{section.title}</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {section.cards.map((card, cardIndex) => (
                <div key={cardIndex} className="rounded-3xl bg-white p-6 text-center shadow-sm border border-slate-200">
                  <div className="mb-4 h-14 w-14 rounded-3xl bg-indigo-50 flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{card.title}</h3>
                  <p className="text-sm text-slate-500">{card.description}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'footer':
        return (
          <div className="rounded-[28px] bg-slate-50 p-10 shadow-sm text-slate-500">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-base font-semibold text-slate-900">{section.company}</p>
                <p className="text-sm">{section.address}</p>
                <p className="text-sm mt-1 text-slate-500">{section.email}</p>
              </div>
              <div className="text-sm">{section.year} © {section.company}. All rights reserved.</div>
            </div>
          </div>
        );
      case 'heading':
        return <h3 className="text-2xl font-bold text-slate-900">{section.heading}</h3>;
      case 'button':
        return (
          <div className="flex">
            <button className="rounded-2xl bg-indigo-600 px-8 py-3 text-white font-medium">{section.buttonText}</button>
          </div>
        );
      case 'html':
        return (
          <div className="rounded-[28px] bg-slate-50 p-8 shadow-sm" style={{ paddingTop: section.padding?.top, paddingRight: section.padding?.right, paddingBottom: section.padding?.bottom, paddingLeft: section.padding?.left, textAlign: section.align }}>
            <div dangerouslySetInnerHTML={{ __html: section.content || '<p className="text-slate-500">Paste your HTML code here.</p>' }} />
          </div>
        );
      case 'image':
        return (
          <div className="rounded-3xl bg-slate-100 overflow-hidden border border-slate-200">
            <div className="h-64 w-full bg-slate-200 flex items-center justify-center text-slate-400">Image Placeholder</div>
          </div>
        );
      case 'divider':
        return <div className="h-0.5 bg-slate-200 rounded-full" />;
      case 'spacer':
        return <div className="h-12" />;
      case 'oneColumn':
        return <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-500">1 Column layout block</div>;
      case 'twoColumns':
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-500">Column 1</div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-500">Column 2</div>
          </div>
        );
      case 'threeColumns':
        return (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-500">Column 1</div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-500">Column 2</div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-500">Column 3</div>
          </div>
        );
      default:
        return <p className="text-slate-600">{section.content || 'Section content'}</p>;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => setSelectedSection(section.id)}
      className={`relative border-2 rounded-3xl p-8 bg-white cursor-pointer transition-all ${
        selectedSection === section.id
          ? 'border-indigo-600 shadow-lg shadow-indigo-100'
          : 'border-slate-200 hover:border-indigo-400'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl border bg-white flex items-center justify-center shadow-sm hover:bg-slate-50"
      >
        <GripVertical className="w-4 h-4 text-slate-500" />
      </button>
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            duplicateSection(section.id);
          }}
          className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm hover:bg-slate-50 flex items-center justify-center"
        >
          <Copy className="w-4 h-4 text-slate-600" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deleteSection(section.id);
          }}
          className="w-10 h-10 rounded-xl bg-white border border-red-200 shadow-sm hover:bg-red-50 flex items-center justify-center"
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </button>
      </div>
      <div className="pl-12">{renderSection()}</div>
    </div>
  );
}
