'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Send,
  Copy,
  ArrowRight,
  RefreshCw,
  FolderPlus,
  BookOpen,
  Layers,
  ExternalLink,
  Search,
  Edit3,
  MoveRight,
  FileText,
  AlertCircle,
  Folder,
  Image as ImageIcon,
  Upload,
  Music,
  Headphones,
  ChevronUp,
  ChevronDown,
  Sparkles,
  CheckSquare,
} from 'lucide-react';
import { decodePageTexts } from '@/lib/story-utils';
import { encodeSetDescription, decodeSetDescription } from '@/lib/set-utils';
import AdminTestManager from '@/components/admin/AdminTestManager';
import { decodeCardTurkish } from '@/lib/card-utils';
import { decodeModuleMetadata, encodeModuleMetadata, MODULE_THEMES, ModuleTheme } from '@/lib/module-utils';

interface CardRow {
  english_text: string;
  turkish_text: string;
  image_url?: string;
  hint?: string;
}

interface StoryPageInput {
  english_text: string;
  turkish_text: string;
  pronunciation: string;
  image_url: string;
  audio_url: string;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'create-set' | 'story-set' | 'manage-classes' | 'all-sets' | 'stories' | 'tests'>('create-set');
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tests Management State
  const [testsList, setTestsList] = useState<any[]>([]);

  // Stories Management State
  const [storiesList, setStoriesList] = useState<any[]>([]);
  const [storySubTab, setStorySubTab] = useState<'create' | 'list'>('create');
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);

  // Story Form State
  const [storyTitle, setStoryTitle] = useState('');
  const [storyCoverUrl, setStoryCoverUrl] = useState('');
  const [storyClassId, setStoryClassId] = useState('');
  const [storyFolderId, setStoryFolderId] = useState('');
  const [storyPages, setStoryPages] = useState<StoryPageInput[]>([
    { english_text: '', turkish_text: '', pronunciation: '', image_url: '', audio_url: '' },
    { english_text: '', turkish_text: '', pronunciation: '', image_url: '', audio_url: '' },
  ]);
  const [createdStoryUrl, setCreatedStoryUrl] = useState<string | null>(null);
  const [isSubmittingStory, setIsSubmittingStory] = useState(false);
  const [storySearchQuery, setStorySearchQuery] = useState('');
  const [uploadingPageImgIndex, setUploadingPageImgIndex] = useState<number | null>(null);
  const [uploadingPageAudioIndex, setUploadingPageAudioIndex] = useState<number | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Story Set (10 Cümlelik Kısa Hikaye) Form State
  const [storySetTitle, setStorySetTitle] = useState('');
  const [storySetSubtitle, setStorySetSubtitle] = useState('');
  const [storySetQuote, setStorySetQuote] = useState('');
  const [storySetCoverUrl, setStorySetCoverUrl] = useState('');
  const [storySetClassId, setStorySetClassId] = useState('');
  const [storySetFolderId, setStorySetFolderId] = useState('');
  const [storyRows, setStoryRows] = useState<{ english_text: string; turkish_text: string; pronunciation: string }[]>([
    { english_text: '', turkish_text: '', pronunciation: '' },
    { english_text: '', turkish_text: '', pronunciation: '' },
    { english_text: '', turkish_text: '', pronunciation: '' },
    { english_text: '', turkish_text: '', pronunciation: '' },
    { english_text: '', turkish_text: '', pronunciation: '' },
    { english_text: '', turkish_text: '', pronunciation: '' },
    { english_text: '', turkish_text: '', pronunciation: '' },
    { english_text: '', turkish_text: '', pronunciation: '' },
    { english_text: '', turkish_text: '', pronunciation: '' },
    { english_text: '', turkish_text: '', pronunciation: '' },
  ]);
  const [showStoryBulkModal, setShowStoryBulkModal] = useState(false);
  const [storyBulkInput, setStoryBulkInput] = useState('');
  const [isSubmittingStorySet, setIsSubmittingStorySet] = useState(false);
  const [createdStorySetUrl, setCreatedStorySetUrl] = useState<string | null>(null);

  // Edit Mode state
  const [editingSetId, setEditingSetId] = useState<string | null>(null);

  // Set Creation / Edit Form states
  const [setTitle, setSetTitle] = useState('');
  const [setDescription, setSetDescription] = useState('');
  const [setCoverUrl, setSetCoverUrl] = useState('');
  const [studyNotes, setStudyNotes] = useState('');
  const [notesViewMode, setNotesViewMode] = useState<'visual' | 'code'>('visual');
  const notesEditorRef = useRef<HTMLDivElement | null>(null);
  
  // Two-step cascading selection
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  
  // Cards Table (Initial empty rows)
  const [cards, setCards] = useState<CardRow[]>([
    { english_text: '', turkish_text: '', image_url: '' },
    { english_text: '', turkish_text: '', image_url: '' },
    { english_text: '', turkish_text: '', image_url: '' },
  ]);

  // Bulk Paste Modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkInput, setBulkInput] = useState('');

  // Move Set Modal State
  const [movingSet, setMovingSet] = useState<any | null>(null);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string>('');

  // Search Filter in Tab 3
  const [searchQuery, setSearchQuery] = useState('');

  // Submitting state & Notices
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSetUrl, setCreatedSetUrl] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Module / Folder Creation in Tab 2
  const [newClassName, setNewClassName] = useState('');
  const [newModuleDesc, setNewModuleDesc] = useState('');
  const [newModuleBadge, setNewModuleBadge] = useState('Story');
  const [newModuleTheme, setNewModuleTheme] = useState<ModuleTheme>('amber');
  const [newModuleIcon, setNewModuleIcon] = useState('📖');
  const [newFolderClassName, setNewFolderClassName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Inline Folder Creation state (for quick folder adding from set/story creation)
  const [showInlineFolderModal, setShowInlineFolderModal] = useState(false);
  const [inlineFolderClassId, setInlineFolderClassId] = useState('');
  const [inlineFolderName, setInlineFolderName] = useState('');
  const [isCreatingInlineFolder, setIsCreatingInlineFolder] = useState(false);
  const [inlineFolderTargetContext, setInlineFolderTargetContext] = useState<'set' | 'storySet'>('set');

  // Module Editing state
  const [editingModule, setEditingModule] = useState<any | null>(null);
  const [editModuleName, setEditModuleName] = useState('');
  const [editModuleDesc, setEditModuleDesc] = useState('');
  const [editModuleBadge, setEditModuleBadge] = useState('Story');
  const [editModuleTheme, setEditModuleTheme] = useState<ModuleTheme>('amber');
  const [editModuleIcon, setEditModuleIcon] = useState('📖');
  const [isSavingModule, setIsSavingModule] = useState(false);

  useEffect(() => {
    loadHierarchy();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  async function loadHierarchy() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*, folders(*, sets(*, set_cards(*)))')
        .order('order_index');

      if (error) throw error;
      if (data) {
        setClasses(data);
        if (!newFolderClassName && data.length > 0) {
          setNewFolderClassName(data[0].id);
        }
      }

      // Also load stories
      const { data: stData, error: stError } = await supabase
        .from('stories')
        .select('*, folders(id, name, class_id, classes(id, name)), story_pages(*)')
        .order('created_at', { ascending: false });

      if (!stError && stData) {
        setStoriesList(stData);
      }

      // Also load manual tests
      const { data: mtData, error: mtError } = await supabase
        .from('manual_tests')
        .select('*, folders(id, name, class_id, classes(id, name)), test_questions(*)')
        .order('created_at', { ascending: false });

      if (!mtError && mtData) {
        setTestsList(mtData);
      }
    } catch (e: any) {
      console.error(e);
      showToast('Yükleme hatası: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  const availableFolders = useMemo(() => {
    if (!selectedClassId) return [];
    const cls = classes.find((c) => c.id === selectedClassId);
    return cls?.folders || [];
  }, [selectedClassId, classes]);

  const availableStorySetFolders = useMemo(() => {
    if (!storySetClassId) return [];
    const cls = classes.find((c) => c.id === storySetClassId);
    return cls?.folders || [];
  }, [storySetClassId, classes]);

  const handleAddStoryRow = () => {
    setStoryRows([...storyRows, { english_text: '', turkish_text: '', pronunciation: '' }]);
  };

  const handleUpdateStoryRow = (
    index: number,
    field: 'english_text' | 'turkish_text' | 'pronunciation',
    val: string
  ) => {
    const updated = [...storyRows];
    updated[index][field] = val;
    setStoryRows(updated);
  };

  const handleRemoveStoryRow = (index: number) => {
    if (storyRows.length <= 1) {
      setStoryRows([{ english_text: '', turkish_text: '', pronunciation: '' }]);
      return;
    }
    setStoryRows(storyRows.filter((_, i) => i !== index));
  };

  const handleApplyStoryBulkPaste = () => {
    if (!storyBulkInput.trim()) return;
    const lines = storyBulkInput.trim().split('\n');
    const parsed = lines
      .map((line) => {
        const parts = line.split('\t');
        return {
          english_text: (parts[0] || '').trim(),
          turkish_text: (parts[1] || '').trim(),
          pronunciation: (parts[2] || '').trim(),
        };
      })
      .filter((r) => r.english_text || r.turkish_text);

    if (parsed.length > 0) {
      setStoryRows(parsed);
      setShowStoryBulkModal(false);
      setStoryBulkInput('');
      showToast(`${parsed.length} cümle tabloya aktarıldı!`);
    } else {
      showToast('Geçerli veri bulunamadı.', 'error');
    }
  };

  const handleSaveStorySet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storySetTitle.trim()) {
      showToast('Lütfen story başlığı yazın.', 'error');
      return;
    }
    const validRows = storyRows.filter((r) => r.english_text.trim());
    if (validRows.length === 0) {
      showToast('Lütfen en az 1 cümle ekleyin.', 'error');
      return;
    }

    let targetFolderId = storySetFolderId;
    if (!targetFolderId && availableStorySetFolders.length > 0) {
      targetFolderId = availableStorySetFolders[0].id;
    }

    try {
      setIsSubmittingStorySet(true);
      const encodedDesc = encodeSetDescription('', storySetCoverUrl, '', {
        isStory: true,
        subtitle: storySetSubtitle.trim(),
        quote: storySetQuote.trim(),
      });

      const payload = {
        folder_id: targetFolderId,
        title: storySetTitle.trim(),
        description: encodedDesc,
        cards: validRows.map((r, idx) => ({
          english_text: r.english_text.trim(),
          turkish_text: r.turkish_text.trim(),
          pronunciation: r.pronunciation.trim(),
          order_index: idx + 1,
        })),
      };

      const res = await fetch('/api/admin/create-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Story kaydedilemedi.');

      setCreatedStorySetUrl(data.shareUrl || `/set/${data.set.slug}`);
      showToast('Story başarıyla oluşturuldu ve yayına alındı!');
      loadHierarchy();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmittingStorySet(false);
    }
  };

  const handleAddCardRow = () => {
    setCards([...cards, { english_text: '', turkish_text: '', image_url: '' }]);
  };

  const handleUpdateCard = (
    index: number,
    field: 'english_text' | 'turkish_text' | 'image_url' | 'hint',
    val: string
  ) => {
    const updated = [...cards];
    updated[index][field] = val;
    setCards(updated);
  };

  const handleRemoveCard = (index: number) => {
    if (cards.length <= 1) {
      setCards([{ english_text: '', turkish_text: '', image_url: '', hint: '' }]);
      return;
    }
    setCards(cards.filter((_, i) => i !== index));
  };

  const handleApplyBulkText = () => {
    if (!bulkInput.trim()) {
      setShowBulkModal(false);
      return;
    }
    const lines = bulkInput.split('\n').filter((l) => l.trim().length > 0);
    const newCards: CardRow[] = lines.map((line) => {
      let parts = line.split('|');
      if (parts.length < 2) parts = line.split('\t');
      if (parts.length < 2) parts = line.split(' - ');
      parts = parts.map((p) => p.trim());

      let img = '';
      let hint = '';

      if (parts.length >= 4) {
        hint = parts[2] || '';
        img = parts[3] || '';
      } else if (parts.length === 3) {
        if (parts[2].startsWith('http://') || parts[2].startsWith('https://')) {
          img = parts[2];
        } else {
          hint = parts[2];
        }
      }

      return {
        english_text: parts[0] || '',
        turkish_text: parts[1] || parts[0] || '',
        hint,
        image_url: img,
      };
    });

    const hasOnlyEmptyCards = cards.every(
      (c) => !c.english_text.trim() && !c.turkish_text.trim()
    );

    if (hasOnlyEmptyCards) {
      setCards(newCards);
    } else {
      setCards([...cards.filter((c) => c.english_text.trim().length > 0), ...newCards]);
    }
    setBulkInput('');
    setShowBulkModal(false);
    showToast(`${newCards.length} kart başarıyla eklendi!`);
  };

  const handleSaveSet = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!setTitle.trim()) {
      showToast('Lütfen set için bir başlık yazın.', 'error');
      return;
    }

    const validCards = cards.filter((c) => c.english_text.trim().length > 0);
    if (validCards.length === 0) {
      showToast('Lütfen en az 1 İngilizce cümle/kelime ekleyin.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const encodedDescription = encodeSetDescription(setDescription, setCoverUrl, studyNotes);

      if (editingSetId) {
        const res = await fetch('/api/admin/update-set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            set_id: editingSetId,
            title: setTitle.trim(),
            description: encodedDescription,
            folder_id: selectedFolderId || null,
            cards: validCards,
          }),
        });
        const data = await res.json();
        if (data.success) {
          showToast('Set başarıyla güncellendi!');
          setEditingSetId(null);
          setCreatedSetUrl(`/set/${data.set.slug}`);
          loadHierarchy();
        } else {
          showToast('Güncelleme hatası: ' + data.error, 'error');
        }
      } else {
        const res = await fetch('/api/admin/create-set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folder_id: selectedFolderId || null,
            title: setTitle.trim(),
            description: encodedDescription,
            cards: validCards,
          }),
        });

        const data = await res.json();
        if (data.success) {
          setCreatedSetUrl(data.shareUrl);
          showToast('Set başarıyla oluşturuldu ve yayına alındı!');
          loadHierarchy();
        } else {
          showToast('Kayıt başarısız: ' + data.error, 'error');
        }
      }
    } catch (err: any) {
      showToast('Hata: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDoc = (cmd: string, val: string = '') => {
    if (typeof document !== 'undefined') {
      document.execCommand(cmd, false, val);
      if (notesEditorRef.current) {
        setStudyNotes(notesEditorRef.current.innerHTML);
      }
    }
  };

  const handleStartEdit = (setObj: any, classObj?: any, folderObj?: any) => {
    setEditingSetId(setObj.id);
    setSetTitle(setObj.title || '');
    
    const { description: cleanDesc, coverImageUrl, studyNotes: notes } = decodeSetDescription(setObj.description);
    setSetDescription(cleanDesc);
    setSetCoverUrl(coverImageUrl);
    setStudyNotes(notes || '');
    if (notesEditorRef.current) {
      notesEditorRef.current.innerHTML = notes || '';
    }

    if (classObj) setSelectedClassId(classObj.id);
    if (folderObj) setSelectedFolderId(folderObj.id);

    const sortedCards = (setObj.set_cards || [])
      .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
      .map((c: any) => {
        const decoded = decodeCardTurkish(c.turkish_text);
        return {
          english_text: c.english_text || '',
          turkish_text: decoded.turkish,
          hint: decoded.hint,
          image_url: c.image_url || '',
        };
      });

    if (sortedCards.length > 0) {
      setCards(sortedCards);
    } else {
      setCards([{ english_text: '', turkish_text: '', image_url: '', hint: '' }]);
    }

    setCreatedSetUrl(null);
    setActiveTab('create-set');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`"${setObj.title}" seti düzenleme masasına alındı.`);
  };

  const handleCancelEdit = () => {
    setEditingSetId(null);
    setSetTitle('');
    setSetDescription('');
    setSetCoverUrl('');
    setStudyNotes('');
    if (notesEditorRef.current) {
      notesEditorRef.current.innerHTML = '';
    }
    setSelectedClassId('');
    setSelectedFolderId('');
    setCards([
      { english_text: '', turkish_text: '', image_url: '' },
      { english_text: '', turkish_text: '', image_url: '' },
    ]);
  };

  const handleDeleteSet = async (setId: string, title: string) => {
    if (!confirm(`"${title}" setini silmek istediğinize emin misiniz?`)) return;

    try {
      const res = await fetch('/api/admin/delete-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ set_id: setId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Set başarıyla silindi.');
        loadHierarchy();
      } else {
        showToast('Silinemedi: ' + data.error, 'error');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleExecuteMove = async () => {
    if (!movingSet || !moveTargetFolderId) return;

    try {
      const res = await fetch('/api/admin/move-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          set_id: movingSet.id,
          folder_id: moveTargetFolderId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`"${movingSet.title}" yeni klasöre taşındı!`);
        setMovingSet(null);
        setMoveTargetFolderId('');
        loadHierarchy();
      } else {
        showToast('Taşıma hatası: ' + data.error, 'error');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    setIsCreatingClass(true);
    try {
      const encodedDesc = encodeModuleMetadata({
        description: newModuleDesc,
        badge: newModuleBadge,
        theme: newModuleTheme,
        icon: newModuleIcon,
      });

      const res = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'class',
          name: newClassName.trim(),
          description: encodedDesc,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`"${newClassName}" modülü başarıyla oluşturuldu!`);
        setNewClassName('');
        setNewModuleDesc('');
        loadHierarchy();
      } else {
        showToast('Hata: ' + data.error, 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsCreatingClass(false);
    }
  };

  const handleReorderModule = async (moduleId: string, direction: 'up' | 'down') => {
    const currentIndex = classes.findIndex((c) => c.id === moduleId);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= classes.length) return;

    // Optimistic swap
    const updated = [...classes];
    const temp = updated[currentIndex];
    updated[currentIndex] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Assign sequential order_index
    const reorderPayload = updated.map((c, idx) => ({
      id: c.id,
      order_index: idx + 1,
    }));

    setClasses(updated);

    try {
      const res = await fetch('/api/admin/classes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reorder: reorderPayload }),
      });
      const data = await res.json();
      if (!data.success) {
        showToast('Sıralama güncellenemedi: ' + data.error, 'error');
        loadHierarchy();
      } else {
        showToast('Modül sırası güncellendi!');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
      loadHierarchy();
    }
  };

  const handleDeleteModule = async (moduleId: string, moduleName: string) => {
    if (
      !confirm(
        `"${moduleName}" modülünü silmek istediğinize emin misiniz? Bu modüle bağlı klasörler ve setler varsa genel havuza aktarılacaktır.`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/classes?id=${moduleId}&type=class`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast(`"${moduleName}" modülü silindi.`);
        loadHierarchy();
      } else {
        showToast('Silme hatası: ' + data.error, 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleStartEditModule = (m: any) => {
    const meta = decodeModuleMetadata(m.description, m.order_index || 0, m.name);
    setEditingModule(m);
    setEditModuleName(m.name);
    setEditModuleDesc(meta.description);
    setEditModuleBadge(meta.badge);
    setEditModuleTheme(meta.theme);
    setEditModuleIcon(meta.icon);
  };

  const handleSaveModuleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModule || !editModuleName.trim()) return;

    setIsSavingModule(true);
    try {
      const encodedDesc = encodeModuleMetadata({
        description: editModuleDesc,
        badge: editModuleBadge,
        theme: editModuleTheme,
        icon: editModuleIcon,
      });

      const res = await fetch('/api/admin/classes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingModule.id,
          name: editModuleName.trim(),
          description: encodedDesc,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`"${editModuleName}" modülü güncellendi!`);
        setEditingModule(null);
        loadHierarchy();
      } else {
        showToast('Güncelleme hatası: ' + data.error, 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSavingModule(false);
    }
  };

  const handleQuickCreateSet = (classId: string, folderId?: string) => {
    setSelectedClassId(classId);
    if (folderId) setSelectedFolderId(folderId);
    setActiveTab('create-set');
  };

  const handleQuickCreateTest = (classId: string) => {
    setActiveTab('tests');
  };

  const handleQuickCreateStory = (classId: string, folderId?: string) => {
    setStoryClassId(classId);
    if (folderId) setStoryFolderId(folderId);
    setStorySubTab('create');
    setActiveTab('stories');
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !newFolderClassName) return;

    setIsCreatingFolder(true);
    try {
      const res = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'folder',
          class_id: newFolderClassName,
          name: newFolderName.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`"${newFolderName}" klasörü oluşturuldu!`);
        setNewFolderName('');
        loadHierarchy();
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleCreateInlineFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineFolderName.trim() || !inlineFolderClassId) return;

    setIsCreatingInlineFolder(true);
    try {
      const res = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'folder',
          class_id: inlineFolderClassId,
          name: inlineFolderName.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.item) {
        showToast(`"${inlineFolderName}" klasörü oluşturuldu ve seçildi! ✨`);
        await loadHierarchy();
        if (inlineFolderTargetContext === 'set') {
          setSelectedFolderId(data.item.id);
        } else {
          setStorySetFolderId(data.item.id);
        }
        setInlineFolderName('');
        setShowInlineFolderModal(false);
      } else {
        throw new Error(data.error || 'Klasör oluşturulamadı');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsCreatingInlineFolder(false);
    }
  };

  const allSetsList = useMemo(() => {
    const list: any[] = [];
    classes.forEach((c) => {
      (c.folders || []).forEach((f: any) => {
        (f.sets || []).forEach((s: any) => {
          list.push({
            ...s,
            className: c.name,
            classId: c.id,
            folderName: f.name,
            folderId: f.id,
            cardCount: s.set_cards?.length || 0,
          });
        });
      });
    });
    return list;
  }, [classes]);

  const filteredSets = useMemo(() => {
    if (!searchQuery.trim()) return allSetsList;
    const q = searchQuery.toLowerCase().trim();
    return allSetsList.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q) ||
        s.folderName.toLowerCase().includes(q)
    );
  }, [allSetsList, searchQuery]);

  // Story available folders
  const storyAvailableFolders = useMemo(() => {
    if (!storyClassId) return [];
    const cls = classes.find((c) => c.id === storyClassId);
    return cls?.folders || [];
  }, [storyClassId, classes]);

  const filteredStories = useMemo(() => {
    if (!storySearchQuery.trim()) return storiesList;
    const q = storySearchQuery.toLowerCase().trim();
    return storiesList.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.folders?.name && s.folders.name.toLowerCase().includes(q)) ||
        (s.folders?.classes?.name && s.folders.classes.name.toLowerCase().includes(q))
    );
  }, [storiesList, storySearchQuery]);

  const handleAddStoryPage = () => {
    setStoryPages([
      ...storyPages,
      { english_text: '', turkish_text: '', pronunciation: '', image_url: '', audio_url: '' },
    ]);
  };

  const handleUpdateStoryPage = (index: number, field: keyof StoryPageInput, val: string) => {
    const updated = [...storyPages];
    updated[index][field] = val;
    setStoryPages(updated);
  };

  const handleRemoveStoryPage = (index: number) => {
    if (storyPages.length <= 1) {
      setStoryPages([{ english_text: '', turkish_text: '', pronunciation: '', image_url: '', audio_url: '' }]);
      return;
    }
    setStoryPages(storyPages.filter((_, i) => i !== index));
  };

  const handleMoveStoryPage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === storyPages.length - 1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...storyPages];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setStoryPages(updated);
  };

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        setStoryCoverUrl(data.url);
        showToast('Kapak görseli yüklendi!');
      } else {
        showToast('Yükleme hatası: ' + data.error, 'error');
      }
    } catch (err: any) {
      showToast('Görsel yüklenemedi: ' + err.message, 'error');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleUploadPageImage = async (e: React.ChangeEvent<HTMLInputElement>, pageIdx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPageImgIndex(pageIdx);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        handleUpdateStoryPage(pageIdx, 'image_url', data.url);
        showToast(`Sayfa ${pageIdx + 1} görseli yüklendi!`);
      } else {
        showToast('Yükleme hatası: ' + data.error, 'error');
      }
    } catch (err: any) {
      showToast('Görsel yüklenemedi: ' + err.message, 'error');
    } finally {
      setUploadingPageImgIndex(null);
    }
  };

  const handleUploadPageAudio = async (e: React.ChangeEvent<HTMLInputElement>, pageIdx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPageAudioIndex(pageIdx);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        handleUpdateStoryPage(pageIdx, 'audio_url', data.url);
        showToast(`Sayfa ${pageIdx + 1} ses kaydı yüklendi!`);
      } else {
        showToast('Yükleme hatası: ' + data.error, 'error');
      }
    } catch (err: any) {
      showToast('Ses yüklenemedi: ' + err.message, 'error');
    } finally {
      setUploadingPageAudioIndex(null);
    }
  };

  const handleFillStoryTemplate = () => {
    setStoryTitle('The Friendly Little Cat');
    setStoryPages([
      {
        english_text: 'Once upon a time, there was a little cat named Leo. He loved to explore the green garden every morning.',
        turkish_text: 'Bir zamanlar Leo adında küçük bir kedi vardı. Her sabah yeşil bahçeyi keşfetmeyi çok severdi.',
        pronunciation: 'Vans apon e taym, der vöz e lidıl ket neymd Liyo. Hi lavd tu eksplor dı grin gardın evri morning.',
        image_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80',
        audio_url: '',
      },
      {
        english_text: 'One sunny day, Leo saw a colorful butterfly dancing on a bright yellow flower. He walked very quietly.',
        turkish_text: 'Güneşli bir gün, Leo parlak sarı bir çiçeğin üzerinde dans eden rengarenk bir kelebek gördü. Çok sessizce yürüdü.',
        pronunciation: 'Van sani dey, Liyo so e kalırful batırflay densing on e brayt yelou flavır. Hi vokt veri kuaytli.',
        image_url: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=600&auto=format&fit=crop&q=80',
        audio_url: '',
      },
      {
        english_text: 'The butterfly smiled and flew higher into the blue sky. Leo was happy because he made a new friend.',
        turkish_text: 'Kelebek gülümsedi ve mavi gökyüzüne doğru daha yükseğe uçtu. Leo mutluydu çünkü yeni bir arkadaş edinmişti.',
        pronunciation: 'Dı batırflay smayld end flyu hayır intu dı blu skay. Liyo vöz hepi bikoz hi meyd e nyu frend.',
        image_url: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=600&auto=format&fit=crop&q=80',
        audio_url: '',
      },
    ]);
    showToast('Örnek hikâye şablonu yüklendi!');
  };

  const handleSaveStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyTitle.trim()) {
      showToast('Lütfen hikâye başlığını yazın.', 'error');
      return;
    }
    const validPages = storyPages.filter((p) => p.english_text.trim().length > 0);
    if (validPages.length === 0) {
      showToast('Lütfen en az 1 sayfa için İngilizce metin yazın.', 'error');
      return;
    }

    setIsSubmittingStory(true);
    try {
      if (editingStoryId) {
        const res = await fetch('/api/admin/update-story', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            story_id: editingStoryId,
            folder_id: storyFolderId || null,
            title: storyTitle.trim(),
            cover_image_url: storyCoverUrl.trim() || null,
            pages: validPages,
          }),
        });
        const data = await res.json();
        if (data.success) {
          showToast('Hikâye başarıyla güncellendi!');
          setEditingStoryId(null);
          setCreatedStoryUrl(`/story/${data.story.slug}`);
          loadHierarchy();
        } else {
          showToast('Güncelleme hatası: ' + data.error, 'error');
        }
      } else {
        const res = await fetch('/api/admin/create-story', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folder_id: storyFolderId || null,
            title: storyTitle.trim(),
            cover_image_url: storyCoverUrl.trim() || null,
            pages: validPages,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setCreatedStoryUrl(data.shareUrl);
          showToast('Hikâye başarıyla oluşturuldu ve yayınlandı!');
          loadHierarchy();
        } else {
          showToast('Kayıt başarısız: ' + data.error, 'error');
        }
      }
    } catch (err: any) {
      showToast('Hata: ' + err.message, 'error');
    } finally {
      setIsSubmittingStory(false);
    }
  };

  const handleStartEditStory = (storyObj: any) => {
    setEditingStoryId(storyObj.id);
    setStoryTitle(storyObj.title || '');
    setStoryCoverUrl(storyObj.cover_image_url || '');
    if (storyObj.folders?.class_id) setStoryClassId(storyObj.folders.class_id);
    if (storyObj.folder_id) setStoryFolderId(storyObj.folder_id);

    const sortedPages = (storyObj.story_pages || [])
      .sort((a: any, b: any) => (a.page_number || 0) - (b.page_number || 0))
      .map((p: any) => {
        const decoded = decodePageTexts(p.turkish_text);
        return {
          english_text: p.english_text || '',
          turkish_text: decoded.turkish,
          pronunciation: decoded.pronunciation || p.pronunciation || '',
          image_url: p.image_url || '',
          audio_url: p.audio_url || '',
        };
      });

    if (sortedPages.length > 0) {
      setStoryPages(sortedPages);
    } else {
      setStoryPages([{ english_text: '', turkish_text: '', pronunciation: '', image_url: '', audio_url: '' }]);
    }

    setCreatedStoryUrl(null);
    setStorySubTab('create');
    setActiveTab('stories');
  };

  const handleDeleteStory = async (storyId: string, title: string) => {
    if (!window.confirm(`"${title}" hikâyesini ve tüm sayfalarını silmek istediğinize emin misiniz?`)) return;
    try {
      const res = await fetch('/api/admin/delete-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story_id: storyId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Hikâye silindi.');
        loadHierarchy();
      } else {
        showToast('Silme hatası: ' + data.error, 'error');
      }
    } catch (e: any) {
      showToast('Hata: ' + e.message, 'error');
    }
  };

  const handleResetStoryForm = () => {
    setEditingStoryId(null);
    setStoryTitle('');
    setStoryCoverUrl('');
    setStoryClassId('');
    setStoryFolderId('');
    setStoryPages([
      { english_text: '', turkish_text: '', pronunciation: '', image_url: '', audio_url: '' },
      { english_text: '', turkish_text: '', pronunciation: '', image_url: '', audio_url: '' },
    ]);
    setCreatedStoryUrl(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-lg border text-sm font-medium flex items-center gap-2.5 animate-in slide-in-from-bottom duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-slate-900 text-white border-slate-800'
              : 'bg-rose-600 text-white border-rose-700'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-white" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <span className="text-xs font-semibold text-brand-600 uppercase tracking-wider">
            YÖNETİM MASASI
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5 tracking-tight">
            Ziya Baran Akademi
          </h1>
        </div>
        <Link
          href="/"
          className="text-xs font-semibold text-slate-700 hover:text-brand-600 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-sm w-fit flex items-center gap-1.5"
        >
          <span>Öğrenci Sayfasını Aç</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex gap-2 p-1.5 bg-slate-200/80 rounded-2xl">
        <button
          onClick={() => setActiveTab('create-set')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'create-set'
              ? 'bg-white text-brand-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 font-medium'
          }`}
        >
          {editingSetId ? (
            <>
              <Edit3 className="w-4 h-4 text-amber-500" />
              <span>Seti Düzenle</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 text-brand-600" />
              <span>Yeni Set Oluştur</span>
            </>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('story-set');
            handleCancelEdit();
          }}
          className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'story-set'
              ? 'bg-white text-amber-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 font-medium'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Story (10 Cümle)</span>
        </button>

        <button
          onClick={() => setActiveTab('manage-classes')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'manage-classes'
              ? 'bg-white text-brand-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 font-medium'
          }`}
        >
          <FolderPlus className="w-4 h-4 text-indigo-600" />
          <span>Modül Yönetimi</span>
        </button>

        <button
          onClick={() => setActiveTab('all-sets')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'all-sets'
              ? 'bg-white text-brand-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 font-medium'
          }`}
        >
          <BookOpen className="w-4 h-4 text-emerald-600" />
          <span>Tüm Setler ({allSetsList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('stories')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'stories'
              ? 'bg-white text-purple-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 font-medium'
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span>Hikâyeler ({storiesList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tests')}
          className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'tests'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 font-medium'
          }`}
        >
          <CheckSquare className="w-4 h-4 text-blue-600" />
          <span>Testler ({testsList.length})</span>
        </button>
      </div>

      {/* ================================================================= */}
      {/* TAB 1: YENİ SET OLUŞTUR VEYA DÜZENLE                              */}
      {/* ================================================================= */}
      {activeTab === 'create-set' && (
        <div className="space-y-6">
          {/* Editing Mode Notice Banner */}
          {editingSetId && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-amber-900 font-semibold text-sm">
                <Edit3 className="w-4 h-4 text-amber-600" />
                <span>Şu anda "{setTitle}" setini düzenliyorsunuz.</span>
              </div>
              <button
                onClick={handleCancelEdit}
                className="text-xs font-semibold text-amber-800 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                Vazgeç / Yeni Sete Dön ✕
              </button>
            </div>
          )}

          {/* Success Banner */}
          {createdSetUrl && (
            <div className="p-6 rounded-3xl bg-emerald-50 border-2 border-emerald-300 space-y-4 shadow-sm animate-in fade-in">
              <div className="flex items-center gap-3 text-emerald-800">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
                <div>
                  <h3 className="text-lg font-bold">
                    {editingSetId ? 'Set Başarıyla Güncellendi!' : 'Harika! Setiniz Yayında!'}
                  </h3>
                  <p className="text-xs font-normal text-emerald-700 mt-0.5">
                    Öğrencileriniz hem webden hem mobil uygulamadan bu seti anında çalışabilir.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href={createdSetUrl}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5"
                >
                  <span>Seti Hemen Aç ve Dene</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <button
                  onClick={() => {
                    const fullUrl = window.location.origin + createdSetUrl;
                    navigator.clipboard.writeText(fullUrl);
                    showToast('Link kopyalandı!');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Linki Kopyala</span>
                </button>

                <button
                  onClick={() => {
                    const fullUrl = window.location.origin + createdSetUrl;
                    const text = encodeURIComponent(
                      `Sevgili öğrenciler, "${setTitle}" çalışmamız hazır:\n${fullUrl}`
                    );
                    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>WhatsApp'ta Paylaş</span>
                </button>

                <button
                  onClick={handleCancelEdit}
                  className="ml-auto text-xs font-medium text-slate-500 hover:underline"
                >
                  + Yeni Bir Set Daha Oluştur
                </button>
              </div>
            </div>
          )}

          {/* Form Content */}
          <form onSubmit={handleSaveSet} className="space-y-6">
            {/* 1. Header Information & Two-Step Class Selection */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900">
                1. Set Başlığı ve Sınıf / Klasör Bağlama
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Set Başlığı:
                  </label>
                  <input
                    type="text"
                    required
                    value={setTitle}
                    onChange={(e) => setSetTitle(e.target.value)}
                    placeholder="Örn: Irregular Verbs 1 veya Daily English 2"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:border-brand-500 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Set Açıklaması (İsteğe Bağlı):
                  </label>
                  <input
                    type="text"
                    value={setDescription}
                    onChange={(e) => setSetDescription(e.target.value)}
                    placeholder="Örn: Günlük konuşmalarda en çok kullanılan kelimeler."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-normal text-slate-900 focus:outline-none focus:border-brand-500 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Set Kapak Görseli URL'si (İsteğe Bağlı):
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <input
                        type="url"
                        value={setCoverUrl}
                        onChange={(e) => setSetCoverUrl(e.target.value)}
                        placeholder="https://... (Örn: Görsel linki)"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-normal text-slate-900 focus:outline-none focus:border-brand-500 bg-slate-50 focus:bg-white"
                      />
                    </div>
                    {setCoverUrl && (
                      <div className="w-14 h-11 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100 flex items-center justify-center shadow-xs">
                        <img
                          src={setCoverUrl}
                          alt="Kapak"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    WhatsApp'ta bu seti paylaştığınızda bu görsel büyük ve zengin bir önizleme olarak görünür.
                  </p>
                </div>

                {/* Two-step Cascading Class & Folder Selection */}
                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3">
                  <span className="text-xs font-semibold text-slate-700 block">
                    Bu seti hangi modüle ve konuya yerleştirmek istersiniz? (İsteğe Bağlı):
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Step 1: Select Module */}
                    <div>
                      <label className="text-[11px] font-medium text-slate-500 block mb-1">
                        1. Modül Seçin:
                      </label>
                      <select
                        value={selectedClassId}
                        onChange={(e) => {
                          const classId = e.target.value;
                          setSelectedClassId(classId);
                          const cls = classes.find((c) => c.id === classId);
                          const firstFolder = cls?.folders?.[0]?.id || '';
                          setSelectedFolderId(firstFolder);
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-800 bg-white focus:outline-none focus:border-brand-500"
                      >
                        <option value="">-- Genel (Modül Atanmamış) --</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Step 2: Select Folder within that Class */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-medium text-slate-500">
                          2. O Sınıfın Klasörünü Seçin:
                        </label>
                        {selectedClassId && (
                          <button
                            type="button"
                            onClick={() => {
                              setInlineFolderClassId(selectedClassId);
                              setInlineFolderTargetContext('set');
                              setShowInlineFolderModal(true);
                            }}
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                          >
                            <FolderPlus className="w-3 h-3" />
                            <span>+ Yeni Klasör Aç</span>
                          </button>
                        )}
                      </div>
                      <select
                        disabled={!selectedClassId}
                        value={selectedFolderId}
                        onChange={(e) => setSelectedFolderId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-800 bg-white focus:outline-none focus:border-brand-500 disabled:opacity-50"
                      >
                        {selectedClassId ? (
                          availableFolders.length > 0 ? (
                            availableFolders.map((f: any) => (
                              <option key={f.id} value={f.id}>
                                📁 {f.name}
                              </option>
                            ))
                          ) : (
                            <option value="">Bu sınıfta klasör yok (Sınıf Masasından ekleyin)</option>
                          )
                        ) : (
                          <option value="">Önce yukarıdan bir sınıf seçin</option>
                        )}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Konu Anlatımı & Ders Notları (İsteğe Bağlı) */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      2. Konu Anlatımı & Notlar (İsteğe Bağlı)
                    </h2>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                      Zengin Metin / Canva Uyumlu
                    </span>
                  </div>
                  <p className="text-xs font-normal text-slate-500 mt-0.5">
                    Bu alana yazdığınız gramer kuralları veya Canva/Word'den kopyaladığınız renkli özetler doğrudan korunur. Boş bırakırsanız öğrenci tarafında Konu Anlatımı butonu görünmez.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setNotesViewMode('visual');
                      setTimeout(() => {
                        if (notesEditorRef.current) notesEditorRef.current.innerHTML = studyNotes;
                      }, 0);
                    }}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                      notesViewMode === 'visual'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Görsel Editör
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotesViewMode('code')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                      notesViewMode === 'code'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    HTML / Kod
                  </button>
                </div>
              </div>

              {notesViewMode === 'visual' ? (
                <div className="space-y-2">
                  {/* Formatting Toolbar */}
                  <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => formatDoc('bold')}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-800 hover:bg-slate-100 transition shadow-2xs"
                      title="Kalınlaştır (Bold)"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => formatDoc('italic')}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-serif italic text-slate-800 hover:bg-slate-100 transition shadow-2xs"
                      title="İtalik"
                    >
                      I
                    </button>

                    <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

                    <button
                      type="button"
                      onClick={() => formatDoc('foreColor', '#dc2626')}
                      className="px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-xs font-bold text-red-600 hover:bg-red-100 transition shadow-2xs"
                      title="Kırmızı Yazı Rengi"
                    >
                      Kırmızı
                    </button>
                    <button
                      type="button"
                      onClick={() => formatDoc('foreColor', '#16a34a')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-600 hover:bg-emerald-100 transition shadow-2xs"
                      title="Yeşil Yazı Rengi"
                    >
                      Yeşil
                    </button>
                    <button
                      type="button"
                      onClick={() => formatDoc('foreColor', '#2563eb')}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs font-bold text-blue-600 hover:bg-blue-100 transition shadow-2xs"
                      title="Mavi Yazı Rengi"
                    >
                      Mavi
                    </button>

                    <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

                    <button
                      type="button"
                      onClick={() => formatDoc('hiliteColor', '#fef08a')}
                      className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition shadow-2xs"
                      title="Sarı Vurgu (Highlight)"
                    >
                      🟡 Vurgula
                    </button>

                    <button
                      type="button"
                      onClick={() => formatDoc('formatBlock', '<h3>')}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition shadow-2xs"
                      title="Alt Başlık Ekle"
                    >
                      Başlık (H3)
                    </button>

                    <button
                      type="button"
                      onClick={() => formatDoc('insertUnorderedList')}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition shadow-2xs"
                      title="Madde İşareti Listesi"
                    >
                      • Liste
                    </button>

                    <button
                      type="button"
                      onClick={() => formatDoc('removeFormat')}
                      className="ml-auto px-2 py-1 rounded-lg text-slate-400 hover:text-slate-600 text-xs transition"
                      title="Biçimi Temizle"
                    >
                      Temizle
                    </button>
                  </div>

                  {/* ContentEditable Visual Area */}
                  <div
                    ref={notesEditorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(e) => setStudyNotes(e.currentTarget.innerHTML)}
                    onBlur={(e) => setStudyNotes(e.currentTarget.innerHTML)}
                    className="w-full min-h-[140px] max-h-[300px] overflow-y-auto p-4 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:border-brand-500 text-sm leading-relaxed text-slate-800 font-normal shadow-inner"
                  />
                </div>
              ) : (
                <div>
                  <textarea
                    rows={6}
                    value={studyNotes}
                    onChange={(e) => {
                      setStudyNotes(e.target.value);
                      if (notesEditorRef.current) {
                        notesEditorRef.current.innerHTML = e.target.value;
                      }
                    }}
                    placeholder="<p><b>Gramer Kuralı:</b> ...</p>"
                    className="w-full p-3 rounded-2xl border border-slate-200 font-mono text-xs text-slate-800 focus:outline-none focus:border-brand-500 bg-slate-50"
                  />
                </div>
              )}
            </div>

            {/* 3. Cards Editor Table */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    3. Cümleler ve Kelimeler ({cards.length} Kart)
                  </h2>
                  <p className="text-xs font-normal text-slate-500 mt-0.5">
                    Kutucuklara tıklayarak istediğiniz yazıyı kolayca değiştirebilirsiniz.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Toplu Cümle Yapıştır</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddCardRow}
                    className="px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-brand-600" />
                    <span>+ Satır Ekle</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCards([
                        { english_text: '', turkish_text: '', image_url: '' },
                        { english_text: '', turkish_text: '', image_url: '' },
                      ]);
                      showToast('Kutular temizlendi');
                    }}
                    className="px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors"
                    title="Kutuları Temizle"
                  >
                    Tümünü Temizle
                  </button>
                </div>
              </div>

              {/* Column labels */}
              <div className="hidden sm:flex items-center gap-3 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <span className="w-6 text-center">#</span>
                <span className="flex-1">İngilizce Cümle / Kelime</span>
                <span className="flex-1">Türkçe Anlamı</span>
                <span className="flex-1">İpucu / Açıklama (İsteğe Bağlı)</span>
                <span className="w-40">Görsel URL</span>
                <span className="w-8"></span>
              </div>

              {/* Cards Rows */}
              <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
                {cards.map((card, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 group focus-within:border-brand-500 focus-within:bg-white transition-all"
                  >
                    <div className="flex items-center justify-between sm:justify-start gap-2">
                      <span className="w-6 text-center text-xs font-semibold text-slate-400 shrink-0">
                        {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCard(index)}
                        className="sm:hidden p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Bu satırı sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={card.english_text}
                        onChange={(e) =>
                          handleUpdateCard(index, 'english_text', e.target.value)
                        }
                        placeholder="İngilizce cümle / kelime..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 bg-white focus:outline-none focus:border-brand-500"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={card.turkish_text}
                        onChange={(e) =>
                          handleUpdateCard(index, 'turkish_text', e.target.value)
                        }
                        placeholder="Türkçe karşılığı..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-700 bg-white focus:outline-none focus:border-brand-500"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={card.hint || ''}
                        onChange={(e) =>
                          handleUpdateCard(index, 'hint', e.target.value)
                        }
                        placeholder="İpucu / Açıklama (opsiyonel)..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-normal text-slate-700 bg-white focus:outline-none focus:border-brand-500"
                        title="Öğrenci cevabı verdikten sonra gösterilecek ipucu/açıklama"
                      />
                    </div>

                    <div className="w-full sm:w-40 flex items-center gap-2 shrink-0">
                      <input
                        type="url"
                        value={card.image_url || ''}
                        onChange={(e) =>
                          handleUpdateCard(index, 'image_url', e.target.value)
                        }
                        placeholder="Görsel URL (opsiyonel)..."
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-normal text-slate-700 bg-white focus:outline-none focus:border-brand-500"
                        title="İsteğe bağlı kart resmi linki"
                      />
                      {card.image_url && (
                        <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-100 flex items-center justify-center shadow-xs">
                          <img
                            src={card.image_url}
                            alt="Önizleme"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveCard(index)}
                      className="hidden sm:block p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                      title="Bu satırı sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleAddCardRow}
                  className="px-4 py-2 rounded-xl border border-dashed border-slate-300 hover:border-brand-500 hover:bg-brand-50 text-xs font-semibold text-slate-600 hover:text-brand-700 flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Yeni Bir Satır Daha Ekle</span>
                </button>

                <span className="text-xs font-normal text-slate-400">
                  Toplam {cards.filter((c) => c.english_text.trim()).length} dolu kart
                </span>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              {editingSetId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors"
                >
                  İptal Et
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm sm:text-base shadow-md shadow-brand-500/25 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Kaydediliyor...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{editingSetId ? 'Değişiklikleri Güncelle' : 'Seti Kaydet ve Yayına Al'}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Bulk Paste Modal */}
          {showBulkModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 max-w-xl w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-bold text-slate-900 text-base">
                    Toplu Cümle Yapıştırma
                  </h3>
                  <button
                    onClick={() => setShowBulkModal(false)}
                    className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-xs font-normal text-slate-500">
                  Aşağıdaki kutucuğa cümleleri yapıştırın. Format: <b>İngilizce | Türkçe</b>
                </p>

                <textarea
                  rows={8}
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  placeholder="I went to school. | Okula gittim.&#10;She ate an apple. | Elma yedi."
                  className="w-full p-3 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 focus:outline-none focus:border-brand-500 bg-slate-50"
                />

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyBulkText}
                    className="px-5 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 shadow-sm"
                  >
                    Kartlara Aktar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 1.5: 10 CÜMLELİK STORY OLUŞTURMA                              */}
      {/* ================================================================= */}
      {activeTab === 'story-set' && (
        <div className="space-y-6">
          {/* Success Banner */}
          {createdStorySetUrl && (
            <div className="p-6 rounded-3xl bg-amber-50 border-2 border-amber-300 space-y-4 shadow-sm animate-in fade-in">
              <div className="flex items-center gap-3 text-amber-900">
                <CheckCircle2 className="w-7 h-7 text-amber-600 shrink-0" />
                <div>
                  <h3 className="text-lg font-bold">Harika! Story Başarıyla Yayında!</h3>
                  <p className="text-xs font-normal text-amber-800 mt-0.5">
                    Öğrencileriniz hem 10 cümlelik görsel tablodan sesli dinleyebilir hem de Kartlar, Test ve Yaz modlarında çalışabilir.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href={createdStorySetUrl}
                  className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5"
                >
                  <span>Story'yi Hemen Aç ve İncele</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    const fullUrl = window.location.origin + createdStorySetUrl;
                    navigator.clipboard.writeText(fullUrl);
                    showToast('Link kopyalandı!');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white border border-amber-300 text-amber-900 text-xs font-semibold hover:bg-amber-100 flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Linki Kopyala</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const fullUrl = window.location.origin + createdStorySetUrl;
                    const text = encodeURIComponent(
                      `Sevgili öğrenciler, "${storySetTitle}" çalışmamız hazır:\n${fullUrl}`
                    );
                    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>WhatsApp'ta Paylaş</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCreatedStorySetUrl(null);
                    setStorySetTitle('');
                    setStorySetSubtitle('');
                    setStorySetQuote('');
                    setStorySetCoverUrl('');
                    setStoryRows([
                      { english_text: '', turkish_text: '', pronunciation: '' },
                      { english_text: '', turkish_text: '', pronunciation: '' },
                      { english_text: '', turkish_text: '', pronunciation: '' },
                      { english_text: '', turkish_text: '', pronunciation: '' },
                      { english_text: '', turkish_text: '', pronunciation: '' },
                      { english_text: '', turkish_text: '', pronunciation: '' },
                      { english_text: '', turkish_text: '', pronunciation: '' },
                      { english_text: '', turkish_text: '', pronunciation: '' },
                      { english_text: '', turkish_text: '', pronunciation: '' },
                      { english_text: '', turkish_text: '', pronunciation: '' },
                    ]);
                  }}
                  className="ml-auto text-xs font-medium text-slate-500 hover:underline"
                >
                  + Yeni Bir Story Daha Oluştur
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSaveStorySet} className="space-y-6">
            {/* 1. Başlık, Alt Başlık ve Modül Seçimi */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>1. Story Başlığı, Alt Başlık ve Modül Bağlama</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Story Başlığı:
                  </label>
                  <input
                    type="text"
                    required
                    value={storySetTitle}
                    onChange={(e) => setStorySetTitle(e.target.value)}
                    placeholder="Örn: This Is My Story 1"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Alt Başlık / Konu:
                  </label>
                  <input
                    type="text"
                    value={storySetSubtitle}
                    onChange={(e) => setStorySetSubtitle(e.target.value)}
                    placeholder="Örn: I am in the bathroom."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Hangi Modüle Eklenecek?
                  </label>
                  <select
                    value={storySetClassId}
                    onChange={(e) => {
                      setStorySetClassId(e.target.value);
                      setStorySetFolderId('');
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <option value="">-- Modül Seçin --</option>
                    {classes.map((cls: any) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-700">
                      Klasör Seçimi (Opsiyonel):
                    </label>
                    {storySetClassId && (
                      <button
                        type="button"
                        onClick={() => {
                          setInlineFolderClassId(storySetClassId);
                          setInlineFolderTargetContext('storySet');
                          setShowInlineFolderModal(true);
                        }}
                        className="text-[11px] font-bold text-amber-700 hover:text-amber-900 hover:underline flex items-center gap-1"
                      >
                        <FolderPlus className="w-3 h-3" />
                        <span>+ Yeni Klasör Aç</span>
                      </button>
                    )}
                  </div>
                  <select
                    value={storySetFolderId}
                    onChange={(e) => setStorySetFolderId(e.target.value)}
                    disabled={!storySetClassId || availableStorySetFolders.length === 0}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">-- Ana Klasör (Varsayılan) --</option>
                    {availableStorySetFolders.map((f: any) => (
                      <option key={f.id} value={f.id}>
                        📁 {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Sahne / Kapak Görseli URL:
                  </label>
                  <input
                    type="url"
                    value={storySetCoverUrl}
                    onChange={(e) => setStorySetCoverUrl(e.target.value)}
                    placeholder="https://... (Örn: Catbox linki veya görsel URL)"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {storySetCoverUrl && (
                    <div className="mt-2 w-20 h-20 rounded-xl overflow-hidden border border-slate-200">
                      <img src={storySetCoverUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Motivasyonel Alıntı / Not (İsteğe Bağlı):
                  </label>
                  <input
                    type="text"
                    value={storySetQuote}
                    onChange={(e) => setStorySetQuote(e.target.value)}
                    placeholder='Örn: "Good habits make a happy day!"'
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* 2. 10 Cümlelik Tablo & Toplu Yapıştır */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    2. Hikaye Cümleleri (İngilizce - Türkçe - Okunuş)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    10 cümlenin İngilizce, Türkçe ve telaffuz rehberini girin. Kartlar, test ve yaz modları otomatik oluşacaktır.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowStoryBulkModal(true)}
                  className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs w-fit"
                >
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>📋 Excel'den Toplu Yapıştır</span>
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-12 text-center">#</th>
                      <th className="py-2.5 px-3">İngilizce Cümle (Zorunlu)</th>
                      <th className="py-2.5 px-3">Türkçe Karşılığı (Zorunlu)</th>
                      <th className="py-2.5 px-3">Okunuşu (Telaffuz Kılavuzu)</th>
                      <th className="py-2.5 px-2 w-12 text-center">Sil</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {storyRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2 px-3 text-center">
                          <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold inline-flex items-center justify-center">
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={row.english_text}
                            onChange={(e) => handleUpdateStoryRow(idx, 'english_text', e.target.value)}
                            placeholder={idx === 0 ? "Örn: I go to the bathroom." : "İngilizce cümle..."}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={row.turkish_text}
                            onChange={(e) => handleUpdateStoryRow(idx, 'turkish_text', e.target.value)}
                            placeholder={idx === 0 ? "Örn: Banyoya giderim." : "Türkçe karşılığı..."}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={row.pronunciation}
                            onChange={(e) => handleUpdateStoryRow(idx, 'pronunciation', e.target.value)}
                            placeholder={idx === 0 ? "Örn: Ay go tu di baethrum." : "Türkçe okunuşu..."}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs sm:text-sm font-normal text-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-indigo-50/30"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveStoryRow(idx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Satırı Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAddStoryRow}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Yeni Cümle Satırı Ekle</span>
                </button>
              </div>
            </div>

            {/* Submit Bar */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmittingStorySet}
                className="px-8 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-sm shadow-md shadow-amber-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isSubmittingStorySet ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Story Kaydediliyor...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Story'yi Kaydet ve Yayınla 🚀</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Bulk Paste Modal */}
          {showStoryBulkModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-600" />
                    <span>Excel'den Toplu Cümle Yapıştır</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowStoryBulkModal(false)}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg text-lg"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Excel tablonuzdan 3 sütunu (<strong>İngilizce</strong>, <strong>Türkçe</strong> ve <strong>Okunuş</strong>) seçip kopyalayın ve aşağıdaki kutuya doğrudan yapıştırın:
                  </p>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 font-mono">
                    I go to the bathroom. [TAB] Banyoya giderim. [TAB] Ay go tu di baethrum.<br/>
                    I turn on the tap. [TAB] Musluğu açarım. [TAB] Ay törn on dı tep.
                  </div>
                  <textarea
                    rows={8}
                    value={storyBulkInput}
                    onChange={(e) => setStoryBulkInput(e.target.value)}
                    placeholder="Excel verinizi buraya yapıştırın..."
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowStoryBulkModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyStoryBulkPaste}
                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs"
                  >
                    Tabloya Aktar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: MODÜL YÖNETİMİ, SIRALAMA & MODÜL İÇİ İÇERİK OLUŞTURMA     */}
      {/* ================================================================= */}
      {activeTab === 'manage-classes' && (
        <div className="space-y-6">
          {/* Edit Module Modal */}
          {editingModule && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-brand-600" />
                    <span>Modülü Düzenle</span>
                  </h3>
                  <button
                    onClick={() => setEditingModule(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSaveModuleEdit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Modül Adı</label>
                    <input
                      type="text"
                      required
                      value={editModuleName}
                      onChange={(e) => setEditModuleName(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Açıklama / Alt Başlık</label>
                    <input
                      type="text"
                      value={editModuleDesc}
                      onChange={(e) => setEditModuleDesc(e.target.value)}
                      placeholder="Örn: Kendi hikayeni keşfet, İngilizceyle anlat!"
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Kategori Rozeti</label>
                      <input
                        type="text"
                        value={editModuleBadge}
                        onChange={(e) => setEditModuleBadge(e.target.value)}
                        placeholder="Örn: Story, Vocabulary..."
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">İkon / Emoji</label>
                      <input
                        type="text"
                        value={editModuleIcon}
                        onChange={(e) => setEditModuleIcon(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Tema Rengi</label>
                    <div className="flex gap-2">
                      {(['amber', 'rose', 'emerald', 'sky', 'purple'] as ModuleTheme[]).map((thm) => (
                        <button
                          key={thm}
                          type="button"
                          onClick={() => setEditModuleTheme(thm)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                            editModuleTheme === thm
                              ? 'border-slate-900 ring-2 ring-slate-900/20 scale-105'
                              : 'border-slate-200 opacity-70 hover:opacity-100'
                          } ${MODULE_THEMES[thm].cardBg}`}
                        >
                          {thm === 'amber' && '🍑'}
                          {thm === 'rose' && '🌸'}
                          {thm === 'emerald' && '🌿'}
                          {thm === 'sky' && '🌊'}
                          {thm === 'purple' && '💜'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setEditingModule(null)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingModule}
                      className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm"
                    >
                      {isSavingModule ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Top Form Cards: Create Module & Create Folder */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Yeni Modül Ekle */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 text-base">
                  Yeni Modül Ekle
                </h3>
              </div>
              <p className="text-xs font-normal text-slate-500">
                Ana sayfadaki renkli kartlar olarak görünecektir (Örn: Kısa Hikâyeler, Kelimeler, 5. Sınıf).
              </p>

              <form onSubmit={handleCreateClass} className="space-y-3">
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="Modül Adı (Örn: Speaking Club)..."
                  className="w-full px-3.5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-brand-500"
                />

                <input
                  type="text"
                  value={newModuleDesc}
                  onChange={(e) => setNewModuleDesc(e.target.value)}
                  placeholder="Açıklama (Örn: Günlük pratikle akıcı konuş!)..."
                  className="w-full px-3.5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-brand-500"
                />

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newModuleBadge}
                    onChange={(e) => setNewModuleBadge(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <option value="Story">Rozet: Story</option>
                    <option value="Reading">Rozet: Reading</option>
                    <option value="Vocabulary">Rozet: Vocabulary</option>
                    <option value="Grammar">Rozet: Grammar</option>
                    <option value="Practice">Rozet: Practice</option>
                    <option value="Science">Rozet: Science</option>
                    <option value="Math">Rozet: Math</option>
                    <option value="Modül">Rozet: Modül</option>
                  </select>

                  <select
                    value={newModuleIcon}
                    onChange={(e) => setNewModuleIcon(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <option value="📖">İkon: 📖 Kitap</option>
                    <option value="📕">İkon: 📕 Kırmızı Kitap</option>
                    <option value="📚">İkon: 📚 Kitap Kulesi</option>
                    <option value="🍎">İkon: 🍎 Elma / Kelime</option>
                    <option value="🐶">İkon: 🐶 Köpekçik</option>
                    <option value="✍️">İkon: ✍️ Yazı Defteri</option>
                    <option value="🎧">İkon: 🎧 Kulaklık / Ses</option>
                    <option value="🌟">İkon: 🌟 Yıldız</option>
                    <option value="🚀">İkon: 🚀 Roket</option>
                  </select>
                </div>

                {/* Theme Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Kart Renk Teması:</label>
                  <div className="flex gap-2">
                    {(['amber', 'rose', 'emerald', 'sky', 'purple'] as ModuleTheme[]).map((thm) => (
                      <button
                        key={thm}
                        type="button"
                        onClick={() => setNewModuleTheme(thm)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          newModuleTheme === thm
                            ? 'border-slate-900 ring-2 ring-slate-900/20 scale-105'
                            : 'border-slate-200 opacity-70 hover:opacity-100'
                        } ${MODULE_THEMES[thm].cardBg}`}
                      >
                        {thm === 'amber' && '🍑'}
                        {thm === 'rose' && '🌸'}
                        {thm === 'emerald' && '🌿'}
                        {thm === 'sky' && '🌊'}
                        {thm === 'purple' && '💜'}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isCreatingClass}
                  className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm transition-all"
                >
                  {isCreatingClass ? 'Ekleniyor...' : '+ Modülü Oluştur'}
                </button>
              </form>
            </div>

            {/* Modüle Konu / Klasör Ekle */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Modüle Konu / Klasör Ekle
                </h3>
              </div>
              <p className="text-xs font-normal text-slate-500">
                Modülün altına alt başlıklar veya üniteler açarak içerikleri gruplayabilirsiniz.
              </p>

              <form onSubmit={handleCreateFolder} className="space-y-3">
                <select
                  value={newFolderClassName}
                  onChange={(e) => setNewFolderClassName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Konu / Klasör Adı (Örn: Ünite 1 - Hayvanlar)..."
                  className="w-full px-3.5 py-2.5 text-sm font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500"
                />

                <button
                  type="submit"
                  disabled={isCreatingFolder}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all"
                >
                  {isCreatingFolder ? 'Ekleniyor...' : '+ Konu Klasörünü Oluştur'}
                </button>
              </form>
            </div>
          </div>

          {/* Modüller Listesi, Sıralama ve İçerik Yönetimi */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-600" />
                  <span>Modüller & Ekran Sıralaması ({classes.length})</span>
                </h3>
                <p className="text-xs font-normal text-slate-500 mt-0.5">
                  Yukarı ⬆️ ve Aşağı ⬇️ butonlarıyla modüllerin ana ekrandaki görünüm sırasını anında değiştirebilirsiniz.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {classes.map((c, idx) => {
                const meta = decodeModuleMetadata(c.description, c.order_index || idx, c.name);
                const theme = MODULE_THEMES[meta.theme];

                let totalItems = 0;
                (c.folders || []).forEach((f: any) => {
                  totalItems += (f.sets?.length || 0);
                });

                return (
                  <div
                    key={c.id}
                    className={`p-5 rounded-2xl border ${theme.border} ${theme.cardBg} space-y-4 transition-all shadow-2xs`}
                  >
                    {/* Module Header Bar with Order, Name, Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/5 pb-3">
                      <div className="flex items-center gap-3">
                        {/* Order badge */}
                        <span className="w-7 h-7 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center shadow-2xs shrink-0">
                          #{idx + 1}
                        </span>

                        <span className="text-2xl">{meta.icon}</span>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 text-base">{c.name}</span>
                          </div>
                          {meta.description && (
                            <p className="text-xs text-slate-600 font-medium line-clamp-1">{meta.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Controls: Reorder Up/Down, Edit, Delete, Quick Create */}
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        {/* Up button */}
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleReorderModule(c.id, 'up')}
                          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs"
                          title="Yukarı Taşı"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>

                        {/* Down button */}
                        <button
                          type="button"
                          disabled={idx === classes.length - 1}
                          onClick={() => handleReorderModule(c.id, 'down')}
                          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs"
                          title="Aşağı Taşı"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>

                        {/* Edit Module */}
                        <button
                          type="button"
                          onClick={() => handleStartEditModule(c)}
                          className="p-2 rounded-xl bg-white border border-slate-200 text-brand-600 hover:bg-brand-50 shadow-2xs"
                          title="Modülü Düzenle"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Delete Module */}
                        <button
                          type="button"
                          onClick={() => handleDeleteModule(c.id, c.name)}
                          className="p-2 rounded-xl bg-white border border-slate-200 text-rose-500 hover:bg-rose-50 shadow-2xs"
                          title="Modülü Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Quick Create Buttons inside this Module */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-xs font-bold text-slate-600 mr-1">Hızlı Ekle:</span>
                      <button
                        type="button"
                        onClick={() => handleQuickCreateSet(c.id)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-brand-50 border border-brand-200 text-brand-700 text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Kelime Seti</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickCreateTest(c.id)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Test</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickCreateStory(c.id)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Sesli Hikâye</span>
                      </button>
                    </div>

                    {/* Sub-Folders & Contents inside this Module */}
                    <div className="space-y-3 pl-2 pt-2 border-t border-black/5">
                      {c.folders?.length === 0 ? (
                        <div className="p-3 bg-white/70 rounded-xl border border-black/5 text-xs text-slate-400 italic">
                          Bu modülde henüz alt klasör yok (Setler doğrudan Genel klasörüne eklenebilir).
                        </div>
                      ) : (
                        c.folders?.map((f: any) => (
                          <div key={f.id} className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-2.5">
                            <div className="flex items-center justify-between text-xs text-slate-800 font-semibold">
                              <span className="flex items-center gap-1.5 text-indigo-700 font-bold">
                                <Folder className="w-3.5 h-3.5" />
                                <span>{f.name}</span>
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                  {f.sets?.length || 0} set
                                </span>
                              </div>
                            </div>

                            {/* Sets inside folder */}
                            <div className="space-y-1.5 pl-3 border-l-2 border-indigo-100">
                              {f.sets?.length === 0 ? (
                                <span className="text-[11px] font-normal text-slate-400 italic">Bu klasörde set yok</span>
                              ) : (
                                f.sets?.map((s: any) => (
                                  <div
                                    key={s.id}
                                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs transition-colors"
                                  >
                                    <div className="font-semibold text-slate-800 flex items-center gap-2">
                                      <span>• {s.title}</span>
                                      <span className="text-[10px] font-normal text-slate-400">
                                        ({s.set_cards?.length || 0} kart)
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => handleStartEdit(s, c, f)}
                                        className="p-1 rounded text-slate-500 hover:text-brand-600 hover:bg-white"
                                        title="Seti Düzenle"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>

                                      <button
                                        onClick={() => {
                                          setMovingSet(s);
                                          setMoveTargetFolderId(f.id);
                                        }}
                                        className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-white"
                                        title="Farklı Klasöre Taşı"
                                      >
                                        <MoveRight className="w-3.5 h-3.5" />
                                      </button>

                                      <button
                                        onClick={() => handleDeleteSet(s.id, s.title)}
                                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-white"
                                        title="Seti Sil"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 3: TÜM SETLER & ARAMA & DÜZENLEME                             */}
      {/* ================================================================= */}
      {activeTab === 'all-sets' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-5">
          {/* Header & Search Input */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Tüm Çalışma Setleri ({allSetsList.length})
              </h3>
              <p className="text-xs font-normal text-slate-500 mt-0.5">
                Arama yapabilir, setlerinizi düzenleyebilir veya paylaşabilirsiniz.
              </p>
            </div>

            {/* Instant Search Bar */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Set adı veya konu ara..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Sets List */}
          {filteredSets.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-normal italic">
              Aramanızla eşleşen set bulunamadı.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSets.map((s) => (
                <div
                  key={s.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 hover:border-brand-500/40 hover:bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm">{s.title}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 font-medium">
                        {s.cardCount} Kart
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-1 font-normal">
                      <span>{s.className}</span>
                      <span>➔</span>
                      <span className="text-slate-600 font-medium">{s.folderName}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => handleStartEdit(s, { id: s.classId }, { id: s.folderId })}
                      className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Seti Düzenle"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                      <span>Düzenle</span>
                    </button>

                    <Link
                      href={`/set/${s.slug}`}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:text-brand-600 flex items-center gap-1 shadow-sm"
                    >
                      <span>Aç</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>

                    <button
                      onClick={() => {
                        const fullUrl = `${window.location.origin}/set/${s.slug}`;
                        navigator.clipboard.writeText(fullUrl);
                        showToast('Link kopyalandı!');
                      }}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800"
                      title="Linki Kopyala"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        const fullUrl = `${window.location.origin}/set/${s.slug}`;
                        const text = encodeURIComponent(
                          `Sevgili öğrenciler, "${s.title}" çalışma setimiz hazır:\n${fullUrl}`
                        );
                        window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                      }}
                      className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                      title="WhatsApp'ta Paylaş"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteSet(s.id, s.title)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Seti Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 4: HİKÂYELER (E-BOOK & STORY STUDIO)                          */}
      {/* ================================================================= */}
      {activeTab === 'stories' && (
        <div className="space-y-6">
          {/* Stories Subtab Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStorySubTab('create')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                  storySubTab === 'create'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {editingStoryId ? '✏️ Hikâyeyi Düzenle' : '✨ Yeni Hikâye Yaz'}
              </button>

              <button
                type="button"
                onClick={() => setStorySubTab('list')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                  storySubTab === 'list'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                📚 Tüm Hikâyeler ({storiesList.length})
              </button>
            </div>

            {editingStoryId && (
              <button
                type="button"
                onClick={handleResetStoryForm}
                className="text-xs font-semibold text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 transition"
              >
                Düzenlemeyi İptal Et ✕
              </button>
            )}
          </div>

          {/* SUBTAB 1: CREATE / EDIT STORY */}
          {storySubTab === 'create' && (
            <div className="space-y-6">
              {/* Success Banner */}
              {createdStoryUrl && (
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <span className="font-bold text-sm sm:text-base">
                      Hikâye başarıyla yayına alındı!
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-normal text-emerald-800">
                    Öğrencileriniz artık bu hikâyeyi e-kitap formatında okuyabilir, telaffuzunu dinleyebilir.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Link
                      href={createdStoryUrl}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition"
                    >
                      <span>Kitabı Aç ve Oku</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        const full = `${window.location.origin}${createdStoryUrl}`;
                        navigator.clipboard.writeText(full);
                        showToast('Bağlantı kopyalandı!');
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 transition"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Linki Kopyala</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const full = `${window.location.origin}${createdStoryUrl}`;
                        const text = encodeURIComponent(
                          `Sevgili öğrenciler, yeni İngilizce hikâyemiz yayında:\n${full}`
                        );
                        window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>WhatsApp'ta Paylaş</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetStoryForm}
                      className="text-xs font-medium text-emerald-700 hover:underline ml-auto"
                    >
                      + Yeni bir hikâye daha yaz
                    </button>
                  </div>
                </div>
              )}

              {/* Story Editor Form */}
              <form onSubmit={handleSaveStory} className="space-y-6">
                {/* 1. Header Information */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-purple-600" />
                      <span>1. Hikâye Genel Bilgileri</span>
                    </h3>
                    <button
                      type="button"
                      onClick={handleFillStoryTemplate}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-semibold transition"
                      title="Hızlı denemek için hazır bir hikâye doldurur"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Örnek Hikâye Şablonu Doldur</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Story Title */}
                    <div className="sm:col-span-3 space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">
                        Hikâye Başlığı <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Örn: The Brave Little Rabbit veya A Day at the Farm"
                        value={storyTitle}
                        onChange={(e) => setStoryTitle(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600"
                        required
                      />
                    </div>

                    {/* Class Selector */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600 block">
                        Sınıf (İsteğe Bağlı)
                      </label>
                      <select
                        value={storyClassId}
                        onChange={(e) => {
                          setStoryClassId(e.target.value);
                          setStoryFolderId('');
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-600"
                      >
                        <option value="">-- Modül Seçin (Genel) --</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Folder Selector */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600 block">
                        Klasör (İsteğe Bağlı)
                      </label>
                      <select
                        value={storyFolderId}
                        onChange={(e) => setStoryFolderId(e.target.value)}
                        disabled={!storyClassId}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-600 disabled:opacity-50"
                      >
                        <option value="">-- Klasör Seçin --</option>
                        {storyAvailableFolders.map((f: any) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Cover Image Upload / URL */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600 block">
                        Kapak Görseli (İsteğe Bağlı)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="url"
                          placeholder="Görsel URL veya Yükle"
                          value={storyCoverUrl}
                          onChange={(e) => setStoryCoverUrl(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-normal text-slate-800 focus:outline-none focus:border-purple-600"
                        />
                        <label className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer text-slate-600 transition" title="Görsel Dosyası Yükle">
                          <Upload className="w-4 h-4" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleUploadCover}
                            disabled={uploadingCover}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Cover Preview Thumbnail */}
                  {storyCoverUrl && (
                    <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl border border-slate-200 w-fit">
                      <img
                        src={storyCoverUrl}
                        alt="Kapak Görseli"
                        className="w-12 h-12 rounded-lg object-cover border"
                      />
                      <div className="text-xs">
                        <p className="font-semibold text-slate-800">Kapak Görseli Hazır</p>
                        <button
                          type="button"
                          onClick={() => setStoryCoverUrl('')}
                          className="text-rose-600 hover:underline text-[11px]"
                        >
                          Kaldır
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Dynamic Story Pages List */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs space-y-6">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        <span>2. Hikâye Sayfaları ({storyPages.length})</span>
                      </h3>
                      <p className="text-xs text-slate-500 font-normal mt-0.5">
                        Her sayfada İngilizce metin, Türkçe çevirisi ve Türkçe harflerle okunuş rehberi ekleyebilirsiniz.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddStoryPage}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 shadow-xs transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Yeni Sayfa Ekle</span>
                    </button>
                  </div>

                  {/* Pages Cards */}
                  <div className="space-y-6">
                    {storyPages.map((page, idx) => (
                      <div
                        key={idx}
                        className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white transition-all space-y-4 shadow-xs"
                      >
                        {/* Page Card Header */}
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                          <span className="text-xs font-bold text-purple-700 bg-purple-100/80 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                            SAYFA {idx + 1}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveStoryPage(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-20 transition"
                              title="Yukarı Taşı"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveStoryPage(idx, 'down')}
                              disabled={idx === storyPages.length - 1}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 disabled:opacity-20 transition"
                              title="Aşağı Taşı"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                            <button
                              type="button"
                              onClick={() => handleRemoveStoryPage(idx)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Sayfayı Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Row 1: English Text (Required) */}
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                            <span>İngilizce Metin <span className="text-rose-500">*</span></span>
                            <span className="text-[11px] font-normal text-slate-400">Öğrencinin okuyacağı ana metin</span>
                          </label>
                          <textarea
                            rows={3}
                            placeholder="Örn: Once upon a time, there was a little cat named Leo..."
                            value={page.english_text}
                            onChange={(e) => handleUpdateStoryPage(idx, 'english_text', e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:border-purple-600"
                            required
                          />
                        </div>

                        {/* Row 2: Turkish Translation */}
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-700 flex items-center justify-between">
                            <span>Türkçe Anlamı / Çevirisi</span>
                            <span className="text-[11px] font-normal text-slate-400">İsteğe bağlı gizlenebilir/açılabilir</span>
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Örn: Bir zamanlar Leo adında küçük bir kedi vardı..."
                            value={page.turkish_text}
                            onChange={(e) => handleUpdateStoryPage(idx, 'turkish_text', e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-normal text-slate-800 focus:outline-none focus:border-purple-600"
                          />
                        </div>

                        {/* Row 3: Turkish Pronunciation Guide */}
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-amber-800 flex items-center gap-1.5">
                            <Headphones className="w-3.5 h-3.5 text-amber-600" />
                            <span>Türkçe Okunuş Rehberi (Nasıl Okunur?)</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Örn: Vans apon e taym, der vöz e lidıl ket neymd Liyo..."
                            value={page.pronunciation}
                            onChange={(e) => handleUpdateStoryPage(idx, 'pronunciation', e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50/40 text-xs font-medium text-amber-900 focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        {/* Row 4: Page Media (Image & Audio) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {/* Page Image */}
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                              <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                              <span>Sayfa Görseli (İsteğe Bağlı)</span>
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="url"
                                placeholder="Görsel URL veya Yükle"
                                value={page.image_url}
                                onChange={(e) => handleUpdateStoryPage(idx, 'image_url', e.target.value)}
                                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-purple-600"
                              />
                              <label className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 cursor-pointer text-slate-600 transition" title="Görsel Yükle">
                                <Upload className="w-3.5 h-3.5" />
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleUploadPageImage(e, idx)}
                                  disabled={uploadingPageImgIndex === idx}
                                  className="hidden"
                                />
                              </label>
                            </div>
                            {page.image_url && (
                              <img
                                src={page.image_url}
                                alt={`Sayfa ${idx + 1}`}
                                className="w-16 h-12 rounded-lg object-cover border mt-1"
                              />
                            )}
                          </div>

                          {/* Page Audio MP3 */}
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600 flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <Music className="w-3.5 h-3.5 text-slate-400" />
                                <span>Seslendirme / MP3 (İsteğe Bağlı)</span>
                              </span>
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="url"
                                placeholder="MP3 URL veya Ses Yükle"
                                value={page.audio_url}
                                onChange={(e) => handleUpdateStoryPage(idx, 'audio_url', e.target.value)}
                                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-purple-600"
                              />
                              <label className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 cursor-pointer text-slate-600 transition" title="MP3 Ses Dosyası Yükle">
                                <Upload className="w-3.5 h-3.5" />
                                <input
                                  type="file"
                                  accept="audio/*"
                                  onChange={(e) => handleUploadPageAudio(e, idx)}
                                  disabled={uploadingPageAudioIndex === idx}
                                  className="hidden"
                                />
                              </label>
                            </div>
                            <p className="text-[10px] text-slate-400">
                              * Boş bırakılırsa öğrenci sayfasında sistemdeki İngilizce TTS konuşur.
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Page Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleAddStoryPage}
                      className="w-full py-3 rounded-2xl border-2 border-dashed border-purple-200 hover:border-purple-400 hover:bg-purple-50/50 text-purple-700 text-xs font-semibold flex items-center justify-center gap-2 transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Bir Sonraki Sayfayı Ekle</span>
                    </button>
                  </div>
                </div>

                {/* Form Submit Button */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingStory}
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 shadow-md shadow-purple-600/25 disabled:opacity-50 transition active:scale-95"
                  >
                    {isSubmittingStory ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Kaydediliyor...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{editingStoryId ? 'Değişiklikleri Güncelle' : 'Hikâyeyi Kaydet & Yayınla'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SUBTAB 2: ALL STORIES DIRECTORY */}
          {storySubTab === 'list' && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                    <span>Yayındaki Hikâyeler ({storiesList.length})</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-normal mt-0.5">
                    Tüm sınıflardaki hikâyeleri görüntüleyin, düzenleyin veya paylaşın.
                  </p>
                </div>

                {/* Search */}
                <div className="relative max-w-xs w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Hikâye veya sınıf ara..."
                    value={storySearchQuery}
                    onChange={(e) => setStorySearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              {filteredStories.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-600">Henüz kayıtlı hikâye bulunmuyor.</p>
                  <button
                    type="button"
                    onClick={() => setStorySubTab('create')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>İlk Hikâyeyi Oluştur</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredStories.map((s) => (
                    <div
                      key={s.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-purple-300 transition-all flex flex-col justify-between space-y-3 shadow-xs"
                    >
                      <div className="flex items-start gap-3">
                        {s.cover_image_url ? (
                          <img
                            src={s.cover_image_url}
                            alt={s.title}
                            className="w-16 h-16 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-7 h-7" />
                          </div>
                        )}

                        <div className="space-y-1 min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                            {s.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                              {s.folders?.classes?.name || 'Genel'}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-600 font-medium">
                              {s.folders?.name || 'Genel Setler'}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="font-semibold text-slate-700">
                              {s.story_pages?.length || 0} Sayfa
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between">
                        <Link
                          href={`/story/${s.slug}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:text-purple-800"
                        >
                          <span>Önizle / Oku</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartEditStory(s)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-purple-700 hover:border-purple-300 transition"
                            title="Hikâyeyi Düzenle"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const fullUrl = `${window.location.origin}/story/${s.slug}`;
                              navigator.clipboard.writeText(fullUrl);
                              showToast('Hikâye linki kopyalandı!');
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 transition"
                            title="Linki Kopyala"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const fullUrl = `${window.location.origin}/story/${s.slug}`;
                              const text = encodeURIComponent(
                                `Sevgili öğrenciler, "${s.title}" İngilizce hikâyemiz hazır:\n${fullUrl}`
                              );
                              window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                            }}
                            className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
                            title="WhatsApp'ta Paylaş"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteStory(s.id, s.title)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Hikâyeyi Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 5: TESTLER VE SINAVLAR YÖNETİMİ                               */}
      {/* ================================================================= */}
      {activeTab === 'tests' && (
        <AdminTestManager
          classes={classes}
          testsList={testsList}
          onRefresh={loadHierarchy}
          showToast={showToast}
        />
      )}
      {movingSet && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                Seti Başka Klasöre Taşı
              </h3>
              <button
                onClick={() => setMovingSet(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 font-normal">
              <b>"{movingSet.title}"</b> setini nereye taşımak istiyorsunuz?
            </p>

            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Hedef Sınıf ve Klasör Seçin:
              </label>
              <select
                value={moveTargetFolderId}
                onChange={(e) => setMoveTargetFolderId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-brand-500"
              >
                {classes.map((c) => (
                  <optgroup key={c.id} label={c.name}>
                    {c.folders?.map((f: any) => (
                      <option key={f.id} value={f.id}>
                        {c.name} ➔ {f.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMovingSet(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleExecuteMove}
                className="px-5 py-2 rounded-xl bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 shadow-sm"
              >
                Taşı
              </button>
            </div>
          </div>
        </div>
      )}

      {showInlineFolderModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateInlineFolder}
            className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-indigo-600" />
                <span>Yeni Klasör Oluştur</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowInlineFolderModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 font-normal">
              Seçili modül: <b>"{classes.find((c: any) => c.id === inlineFolderClassId)?.name || 'Modül'}"</b>
            </p>

            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Klasör / Konu Adı:
              </label>
              <input
                type="text"
                required
                autoFocus
                value={inlineFolderName}
                onChange={(e) => setInlineFolderName(e.target.value)}
                placeholder="Örn: Fiiller, Günlük Kalıplar, Ünite 1..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowInlineFolderModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={isCreatingInlineFolder || !inlineFolderName.trim()}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm disabled:opacity-50"
              >
                {isCreatingInlineFolder ? 'Oluşturuluyor...' : 'Klasörü Oluştur'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
