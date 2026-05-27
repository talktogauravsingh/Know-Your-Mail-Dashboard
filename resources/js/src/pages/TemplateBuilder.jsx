// resources/js/src/pages/TemplateBuilder.jsx
import React, { useEffect, useRef, useState } from 'react';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

import { Select } from '../components/ui/Select';
import { useStore } from '../store/useStore';
import api from '../lib/api';


export default function TemplateBuilder() {
  const editorRef = useRef(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Newsletter');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const addToast = useStore(state => state.addToast);

  // Initialise GrapesJS editor once
  useEffect(() => {
    if (!editorRef.current) {
      const editor = grapesjs.init({
        container: '#gjs',
        fromElement: false,
        height: '600px',
        storageManager: false,
        panels: { defaults: [] },
        // Basic safe defaults – no external scripts allowed (security)
        jsConfig: { 
          // Disallow remote script execution
          allowScripts: false 
        }
      });
      editorRef.current = editor;
    }
    // Cleanup on unmount
    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  const handleSave = async () => {
    if (!name) {
      addToast('Template name is required', 'error');
      return;
    }
    setSaving(true);
    try {
      const htmlContent = editorRef.current?.getHtml() || '';
      const cssContent = editorRef.current?.getCss() || '';
      const jsonDesign = editorRef.current?.getComponents(); // raw component JSON
      const payload = {
        template_name: name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        category,
        description,
        html_content: htmlContent,
        css_content: cssContent,
        json_design: JSON.stringify(jsonDesign),
        // optional fields can be added later (preview_text, tags, variables)
      };
      await api.post('/email-templates', payload);
      addToast('Template saved successfully', 'success');
      // Reset UI
      setName('');
      setDescription('');
      setCategory('Newsletter');
      editorRef.current?.loadComponents('');
      editorRef.current?.loadStyle('');
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.message || 'Failed to save template', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Create New Email Template</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left panel – metadata form */}
        <div className="space-y-4">
          <Input
            label="Template Name"
            placeholder="e.g., Welcome Series"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <Select
            label="Category"
            options={['Newsletter', 'Promotion', 'Onboarding', 'Retention', 'Event']}
            value={category}
            onChange={e => setCategory(e.target.value)}
          />
          <Textarea
            label="Description"
            placeholder="Brief description of the template purpose"
            rows={4}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? 'Saving…' : 'Save Template'}
            </Button>
          </div>
        </div>
        {/* Right panel – GrapesJS editor */}
        <div className="border rounded-lg overflow-hidden" id="gjs">
          {/* GrapesJS will mount into this div */}
        </div>
      </div>
    </div>
  );
}
