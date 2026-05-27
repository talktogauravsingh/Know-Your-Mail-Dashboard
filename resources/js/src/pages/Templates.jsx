import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Search, Plus, LayoutTemplate, TrendingUp, Eye, Edit2, Trash2, X } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function Templates() {
  const templates = useStore((state) => state.templates);
  const templatesLoading = useStore((state) => state.templatesLoading);
  const fetchTemplates = useStore((state) => state.fetchTemplates);
  const addTemplate = useStore((state) => state.addTemplate);
  const updateTemplate = useStore((state) => state.updateTemplate);
  const deleteTemplate = useStore((state) => state.deleteTemplate);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const filters = ['All', 'Onboarding', 'Promotion', 'Newsletter', 'Retention', 'Product', 'Event'];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [formData, setFormData] = useState({ name: '', category: 'Newsletter', description: '' });

  const handleOpenCreate = () => {
    navigate('/templates/designer');
  };

  const handleOpenEdit = (e, template) => {
    e.preventDefault();
    setModalMode('edit');
    setCurrentTemplate(template);
    setFormData({ name: template.name, category: template.category, description: template.description });
    setIsModalOpen(true);
  };

  const handleOpenPreview = (e, template) => {
    e.preventDefault();
    setModalMode('preview');
    setCurrentTemplate(template);
    setIsModalOpen(true);
  };

  const handleDelete = (e, id) => {
    e.preventDefault();
    if(window.confirm('Are you sure you want to delete this template?')) {
      deleteTemplate(id);
    }
  };

  const handleModalSubmit = (e) => {
    e.preventDefault();
    if(modalMode === 'create') {
      addTemplate({
        ...formData,
        avgOpenRate: '-',
        color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
      });
    } else if(modalMode === 'edit') {
      updateTemplate(currentTemplate.id, formData);
    }
    setIsModalOpen(false);
  };

  useEffect(() => {
    fetchTemplates().catch(() => {});
  }, [fetchTemplates]);

  const filteredTemplates = templates.filter(t => 
    (activeFilter === 'All' || t.category === activeFilter) &&
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Saved Templates</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">All your created templates are listed here. Use the designer to add or edit templates.</p>
          {templatesLoading && <p className="text-sm text-slate-500 mt-2">Loading templates…</p>}
        </div>
        <Button onClick={handleOpenCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Create Custom Template
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="w-full lg:w-auto flex flex-wrap gap-2">
          {filters.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeFilter === filter 
                  ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-50 dark:text-slate-900' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/50'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search templates..." 
            className="pl-9 bg-white dark:bg-slate-950 rounded-full border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="group overflow-hidden border-slate-200/60 dark:border-slate-800/60 hover:border-indigo-500/30 dark:hover:border-indigo-400/30 transition-all hover:shadow-md bg-white dark:bg-slate-950 flex flex-col">
            <div className="h-44 bg-slate-50/50 dark:bg-slate-900/20 flex items-center justify-center relative border-b border-slate-100 dark:border-slate-800/50">
              <div className={`p-4 rounded-2xl ${template.color} shadow-sm transition-transform group-hover:scale-110 duration-500 ease-out`}>
                <LayoutTemplate className="w-10 h-10 opacity-90" strokeWidth={1.5} />
              </div>
              
              {/* Action Buttons Container (Top Right) */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={(e) => handleOpenEdit(e, template)}
                  className="h-8 w-8 rounded-full bg-white/80 hover:bg-white text-slate-700 shadow-sm backdrop-blur-sm dark:bg-slate-900/80 dark:hover:bg-slate-800 dark:text-slate-300"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={(e) => handleDelete(e, template.id)}
                  className="h-8 w-8 rounded-full bg-white/80 hover:bg-white hover:text-red-600 text-slate-700 shadow-sm backdrop-blur-sm dark:bg-slate-900/80 dark:hover:bg-slate-800 dark:text-slate-300 dark:hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-slate-900/5 dark:bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 backdrop-blur-[2px]">
                <Button 
                  onClick={(e) => handleOpenPreview(e, template)}
                  variant="secondary" size="sm" className="shadow-sm gap-1.5 h-9 bg-white hover:bg-slate-100 text-slate-900 border-none">
                  <Eye className="w-3.5 h-3.5" /> Preview
                </Button>
                <Link to={`/campaigns/new?template=${template.id}`}>
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm gap-1.5 h-9">
                    Use Layout
                  </Button>
                </Link>
              </div>
            </div>
            
            <CardContent className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <div className="pr-3">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-50 line-clamp-1 text-base leading-tight mb-1.5">{template.name}</h3>
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {template.category}
                  </span>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <Badge variant="success" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20 gap-1.5 py-1 px-2">
                    <TrendingUp className="w-3.5 h-3.5" /> {template.avgOpenRate}
                  </Badge>
                  <span className="text-[10px] text-slate-400 mt-1.5 font-medium tracking-wider uppercase">Avg. Open</span>
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-auto line-clamp-2 leading-relaxed">
                {template.description}
              </p>
            </CardContent>
          </Card>
        ))}
        {filteredTemplates.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <LayoutTemplate className="mx-auto h-8 w-8 text-slate-400 mb-3" />
            <h3 className="text-sm font-medium text-slate-900 dark:text-slate-50">No templates found</h3>
            <p className="text-sm text-slate-500 mt-1">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-950 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                {modalMode === 'create' && 'Create Custom Template'}
                {modalMode === 'edit' && 'Edit Template'}
                {modalMode === 'preview' && 'Template Preview'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5">
              {modalMode === 'preview' && currentTemplate ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                     <div className={`p-4 rounded-xl ${currentTemplate.color} shrink-0`}>
                        <LayoutTemplate className="w-8 h-8 opacity-90" />
                     </div>
                     <div>
                        <h4 className="font-semibold text-lg text-slate-900 dark:text-slate-50">{currentTemplate.name}</h4>
                        <p className="text-sm text-slate-500">{currentTemplate.category} Template</p>
                     </div>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {currentTemplate.description}
                    </p>
                  </div>
                  
                  {/* Mock content rendering area */}
                  <div className="w-full h-64 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/20">
                     <LayoutTemplate className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                     <p className="text-sm text-slate-400">Mock Template Content Preview</p>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Link to={`/campaigns/new?template=${currentTemplate.id}`}>
                      <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">Use This Layout</Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleModalSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Template Name</label>
                    <Input 
                      required
                      placeholder="e.g., Abandoned Cart Alert" 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="bg-white dark:bg-slate-950"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
                    <select 
                      required
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm ring-offset-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:focus-visible:ring-slate-300"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    >
                      {filters.filter(f => f !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                    <textarea 
                      required
                      placeholder="Outline the purpose of this layout..."
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="flex min-h-[100px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:focus-visible:ring-slate-300 resize-none"
                    ></textarea>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      {modalMode === 'create' ? 'Create Template' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
