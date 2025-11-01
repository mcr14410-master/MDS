import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Package, FileText, Wrench, ChevronDown, ChevronRight, X, Save } from 'lucide-react';
import { bauteilService, ncProgrammService, werkzeugService } from './services/api';
import './App.css';

function App() {
  const [activeModule, setActiveModule] = useState('bauteile');
  const [bauteile, setBauteile] = useState([]);
  const [ncProgramme, setNcProgramme] = useState([]);
  const [werkzeuge, setWerkzeuge] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [activeModule]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeModule === 'bauteile') {
        const response = await bauteilService.getAll();
        setBauteile(response.data);
      } else if (activeModule === 'nc-programme') {
        const response = await ncProgrammService.getAll();
        setNcProgramme(response.data);
      } else if (activeModule === 'werkzeuge') {
        const response = await werkzeugService.getAll();
        setWerkzeuge(response.data);
      }
    } catch (err) {
      setError('Fehler beim Laden der Daten: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, type) => {
    if (!window.confirm('Wirklich löschen?')) return;
    
    try {
      if (type === 'bauteil') {
        await bauteilService.delete(id);
        setBauteile(bauteile.filter(b => b.id !== id));
      } else if (type === 'nc-programm') {
        await ncProgrammService.delete(id);
        setNcProgramme(ncProgramme.filter(n => n.id !== id));
      } else if (type === 'werkzeug') {
        await werkzeugService.delete(id);
        setWerkzeuge(werkzeuge.filter(w => w.id !== id));
      }
    } catch (err) {
      alert('Fehler beim Löschen: ' + err.message);
    }
  };

  const openModal = (type, item = null) => {
    setModalType(type);
    setEditingItem(item);
    setShowModal(true);
  };

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filterItems = (items, searchFields) => {
    if (!searchTerm) return items;
    return items.filter(item =>
      searchFields.some(field =>
        item[field]?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Fertigungsdaten Management</h1>
        <nav>
          <button
            className={activeModule === 'bauteile' ? 'active' : ''}
            onClick={() => setActiveModule('bauteile')}
          >
            <Package size={18} />
            Bauteile
          </button>
          <button
            className={activeModule === 'nc-programme' ? 'active' : ''}
            onClick={() => setActiveModule('nc-programme')}
          >
            <FileText size={18} />
            NC-Programme
          </button>
          <button
            className={activeModule === 'werkzeuge' ? 'active' : ''}
            onClick={() => setActiveModule('werkzeuge')}
          >
            <Wrench size={18} />
            Werkzeuge
          </button>
        </nav>
      </header>

      <main className="app-main">
        <div className="toolbar">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={() => openModal(activeModule)}>
            <Plus size={20} />
            Neu
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {loading && <div className="loading">Lädt...</div>}

        <div className="content">
          {activeModule === 'bauteile' && (
            <BauteileList
              bauteile={filterItems(bauteile, ['zeichnungsnummer', 'benennung', 'material', 'kunde'])}
              onEdit={(item) => openModal('bauteil', item)}
              onDelete={(id) => handleDelete(id, 'bauteil')}
              expandedItems={expandedItems}
              toggleExpand={toggleExpand}
            />
          )}

          {activeModule === 'nc-programme' && (
            <NcProgrammeList
              programme={filterItems(ncProgramme, ['programmname', 'bearbeitungsschritt', 'maschine'])}
              onEdit={(item) => openModal('nc-programm', item)}
              onDelete={(id) => handleDelete(id, 'nc-programm')}
            />
          )}

          {activeModule === 'werkzeuge' && (
            <WerkzeugeList
              werkzeuge={filterItems(werkzeuge, ['nummer', 'bezeichnung', 'typ', 'hersteller'])}
              onEdit={(item) => openModal('werkzeug', item)}
              onDelete={(id) => handleDelete(id, 'werkzeug')}
            />
          )}
        </div>
      </main>

      {showModal && (
        <Modal
          type={modalType}
          item={editingItem}
          bauteile={bauteile}
          onClose={() => {
            setShowModal(false);
            setEditingItem(null);
          }}
          onSave={loadData}
        />
      )}
    </div>
  );
}

// Bauteile Liste Komponente
const BauteileList = ({ bauteile, onEdit, onDelete, expandedItems, toggleExpand }) => {
  if (bauteile.length === 0) {
    return <div className="empty-state">Keine Bauteile vorhanden</div>;
  }

  return (
    <div className="item-list">
      {bauteile.map(bauteil => (
        <div key={bauteil.id} className="item-card">
          <div className="item-header">
            <div className="item-info">
              <button className="expand-btn" onClick={() => toggleExpand(bauteil.id)}>
                {expandedItems[bauteil.id] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </button>
              <div>
                <h3>
                  {bauteil.zeichnungsnummer}
                  {bauteil.revision && <span className="badge">Rev. {bauteil.revision}</span>}
                </h3>
                <p>{bauteil.benennung}</p>
                {bauteil.material && <span className="meta">Material: {bauteil.material}</span>}
                {bauteil.kunde && <span className="meta">Kunde: {bauteil.kunde}</span>}
              </div>
            </div>
            <div className="item-actions">
              <button onClick={() => onEdit(bauteil)} className="btn-icon">
                <Edit2 size={18} />
              </button>
              <button onClick={() => onDelete(bauteil.id)} className="btn-icon btn-danger">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
          {expandedItems[bauteil.id] && bauteil.notizen && (
            <div className="item-details">
              <p>{bauteil.notizen}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// NC-Programme Liste
const NcProgrammeList = ({ programme, onEdit, onDelete }) => {
  if (programme.length === 0) {
    return <div className="empty-state">Keine NC-Programme vorhanden</div>;
  }

  return (
    <div className="item-list">
      {programme.map(prog => (
        <div key={prog.id} className="item-card">
          <div className="item-header">
            <div className="item-info">
              <h3>{prog.programmname}</h3>
              {prog.zeichnungsnummer && <p>Bauteil: {prog.zeichnungsnummer} - {prog.benennung}</p>}
              {prog.bearbeitungsschritt && <span className="meta">Schritt: {prog.bearbeitungsschritt}</span>}
              {prog.maschine && <span className="meta">Maschine: {prog.maschine}</span>}
            </div>
            <div className="item-actions">
              <button onClick={() => onEdit(prog)} className="btn-icon">
                <Edit2 size={18} />
              </button>
              <button onClick={() => onDelete(prog.id)} className="btn-icon btn-danger">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Werkzeuge Liste
const WerkzeugeList = ({ werkzeuge, onEdit, onDelete }) => {
  if (werkzeuge.length === 0) {
    return <div className="empty-state">Keine Werkzeuge vorhanden</div>;
  }

  return (
    <div className="item-list">
      {werkzeuge.map(werkzeug => (
        <div key={werkzeug.id} className="item-card">
          <div className="item-header">
            <div className="item-info">
              <h3>T{werkzeug.nummer} - {werkzeug.bezeichnung}</h3>
              {werkzeug.typ && <span className="meta">{werkzeug.typ}</span>}
              {werkzeug.durchmesser && <span className="meta">Ø {werkzeug.durchmesser}mm</span>}
              {werkzeug.hersteller && <span className="meta">{werkzeug.hersteller}</span>}
            </div>
            <div className="item-actions">
              <button onClick={() => onEdit(werkzeug)} className="btn-icon">
                <Edit2 size={18} />
              </button>
              <button onClick={() => onDelete(werkzeug.id)} className="btn-icon btn-danger">
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Modal Komponente
const Modal = ({ type, item, bauteile, onClose, onSave }) => {
  const [formData, setFormData] = useState(item || {});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (type === 'bauteil' || type === 'bauteile') {
        if (item) {
          await bauteilService.update(item.id, formData);
        } else {
          await bauteilService.create(formData);
        }
      } else if (type === 'nc-programm' || type === 'nc-programme') {
        if (item) {
          await ncProgrammService.update(item.id, formData);
        } else {
          await ncProgrammService.create(formData);
        }
      } else if (type === 'werkzeug' || type === 'werkzeuge') {
        if (item) {
          await werkzeugService.update(item.id, formData);
        } else {
          await werkzeugService.create(formData);
        }
      }

      onSave();
      onClose();
    } catch (err) {
      alert('Fehler beim Speichern: ' + err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderFields = () => {
    const normalizedType = type.replace(/e$/, '');
    
    if (normalizedType === 'bauteil' || normalizedType === 'bauteil') {
      return (
        <>
          <input
            type="text"
            placeholder="Zeichnungsnummer *"
            required
            value={formData.zeichnungsnummer || ''}
            onChange={(e) => setFormData({ ...formData, zeichnungsnummer: e.target.value })}
          />
          <input
            type="text"
            placeholder="Benennung *"
            required
            value={formData.benennung || ''}
            onChange={(e) => setFormData({ ...formData, benennung: e.target.value })}
          />
          <input
            type="text"
            placeholder="Revision"
            value={formData.revision || ''}
            onChange={(e) => setFormData({ ...formData, revision: e.target.value })}
          />
          <input
            type="text"
            placeholder="Material"
            value={formData.material || ''}
            onChange={(e) => setFormData({ ...formData, material: e.target.value })}
          />
          <input
            type="text"
            placeholder="Kunde"
            value={formData.kunde || ''}
            onChange={(e) => setFormData({ ...formData, kunde: e.target.value })}
          />
          <textarea
            placeholder="Notizen"
            rows="3"
            value={formData.notizen || ''}
            onChange={(e) => setFormData({ ...formData, notizen: e.target.value })}
          />
        </>
      );
    }

    if (normalizedType === 'nc-programm') {
      return (
        <>
          <select
            required
            value={formData.bauteil_id || ''}
            onChange={(e) => setFormData({ ...formData, bauteil_id: e.target.value })}
          >
            <option value="">Bauteil wählen *</option>
            {bauteile.map(b => (
              <option key={b.id} value={b.id}>
                {b.zeichnungsnummer} - {b.benennung}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Programmname *"
            required
            value={formData.programmname || ''}
            onChange={(e) => setFormData({ ...formData, programmname: e.target.value })}
          />
          <input
            type="text"
            placeholder="Bearbeitungsschritt"
            value={formData.bearbeitungsschritt || ''}
            onChange={(e) => setFormData({ ...formData, bearbeitungsschritt: e.target.value })}
          />
          <input
            type="text"
            placeholder="Maschine"
            value={formData.maschine || ''}
            onChange={(e) => setFormData({ ...formData, maschine: e.target.value })}
          />
          <textarea
            placeholder="Programmcode"
            rows="5"
            value={formData.programmcode || ''}
            onChange={(e) => setFormData({ ...formData, programmcode: e.target.value })}
          />
        </>
      );
    }

    if (normalizedType === 'werkzeug') {
      return (
        <>
          <input
            type="text"
            placeholder="Werkzeugnummer *"
            required
            value={formData.nummer || ''}
            onChange={(e) => setFormData({ ...formData, nummer: e.target.value })}
          />
          <input
            type="text"
            placeholder="Bezeichnung *"
            required
            value={formData.bezeichnung || ''}
            onChange={(e) => setFormData({ ...formData, bezeichnung: e.target.value })}
          />
          <input
            type="text"
            placeholder="Typ (Fräser, Bohrer, etc.)"
            value={formData.typ || ''}
            onChange={(e) => setFormData({ ...formData, typ: e.target.value })}
          />
          <input
            type="number"
            step="0.001"
            placeholder="Durchmesser (mm)"
            value={formData.durchmesser || ''}
            onChange={(e) => setFormData({ ...formData, durchmesser: e.target.value })}
          />
          <input
            type="number"
            step="0.01"
            placeholder="Schnittgeschwindigkeit (m/min)"
            value={formData.schnittgeschwindigkeit || ''}
            onChange={(e) => setFormData({ ...formData, schnittgeschwindigkeit: e.target.value })}
          />
          <input
            type="number"
            step="0.0001"
            placeholder="Vorschub (mm/U)"
            value={formData.vorschub || ''}
            onChange={(e) => setFormData({ ...formData, vorschub: e.target.value })}
          />
          <input
            type="text"
            placeholder="Hersteller"
            value={formData.hersteller || ''}
            onChange={(e) => setFormData({ ...formData, hersteller: e.target.value })}
          />
        </>
      );
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{item ? 'Bearbeiten' : 'Neu anlegen'}</h2>
          <button onClick={onClose} className="btn-icon">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {renderFields()}
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">
              Abbrechen
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              <Save size={18} />
              {saving ? 'Speichert...' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default App;
