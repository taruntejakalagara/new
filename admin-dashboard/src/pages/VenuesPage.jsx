import { useState, useEffect } from 'react';
import { 
  Building2, Plus, Edit2, Trash2, MapPin, Phone,
  Settings, ChevronRight, Search, Filter
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';

function VenueRow({ venue, onEdit, onDelete }) {
  return (
    <div className="card card-hover p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: venue.branding?.primaryColor + '20' || '#6366f120' }}
        >
          <Building2 size={24} style={{ color: venue.branding?.primaryColor || '#6366f1' }} />
        </div>
        <div>
          <h3 className="font-semibold text-white">{venue.name}</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <MapPin size={12} />
              {venue.contact?.address || 'No address'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-center">
          <p className="text-lg font-bold text-white">{venue.settings?.hooksCount || 50}</p>
          <p className="text-xs text-slate-500">Hooks</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-emerald-400">${venue.pricing?.baseFee || 15}</p>
          <p className="text-xs text-slate-500">Base Fee</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onEdit(venue)}
            className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <Edit2 size={18} />
          </button>
          <button 
            onClick={() => onDelete(venue)}
            className="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
          >
            <Trash2 size={18} />
          </button>
          <ChevronRight size={18} className="text-slate-600" />
        </div>
      </div>
    </div>
  );
}

function VenueModal({ venue, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    slug: '',
    address: '',
    phone: '',
    hooksCount: 50,
    baseFee: 15,
    priorityFee: 25,
    primaryColor: '#C9A962',
  });

  useEffect(() => {
    if (venue) {
      setFormData({
        name: venue.name || '',
        shortName: venue.shortName || '',
        slug: venue.slug || '',
        address: venue.contact?.address || '',
        phone: venue.contact?.phone || '',
        hooksCount: venue.settings?.hooksCount || 50,
        baseFee: venue.pricing?.baseFee || 15,
        priorityFee: venue.pricing?.priorityFee || 25,
        primaryColor: venue.branding?.primaryColor || '#C9A962',
      });
    }
  }, [venue]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-2xl w-full max-w-lg p-6 border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-6">
          {venue ? 'Edit Venue' : 'Add New Venue'}
        </h2>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Venue Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                placeholder="Fairmont Pittsburgh"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Short Name</label>
              <input
                type="text"
                value={formData.shortName}
                onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                placeholder="Fairmont"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              placeholder="510 Market St, Pittsburgh, PA"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                placeholder="+1 412-773-8800"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Number of Hooks</label>
              <input
                type="number"
                value={formData.hooksCount}
                onChange={(e) => setFormData({ ...formData, hooksCount: parseInt(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Base Fee ($)</label>
              <input
                type="number"
                value={formData.baseFee}
                onChange={(e) => setFormData({ ...formData, baseFee: parseInt(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Priority Fee ($)</label>
              <input
                type="number"
                value={formData.priorityFee}
                onChange={(e) => setFormData({ ...formData, priorityFee: parseInt(e.target.value) })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Brand Color</label>
              <input
                type="color"
                value={formData.primaryColor}
                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                className="w-full h-10 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={() => onSave(formData)} className="btn btn-primary">Save Venue</button>
        </div>
      </div>
    </div>
  );
}

export default function VenuesPage() {
  const [venues, setVenues] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState(null);

  const fetchVenues = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/venues`);
      const data = await response.json();
      if (data.success && data.venues) {
        setVenues(data.venues);
      }
    } catch (error) {
      console.error('Error fetching venues:', error);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  const handleEdit = (venue) => {
    setSelectedVenue(venue);
    setModalOpen(true);
  };

  const handleDelete = (venue) => {
    if (confirm(`Are you sure you want to delete ${venue.name}?`)) {
      // API call to delete
      setVenues(venues.filter(v => v.id !== venue.id));
    }
  };

  const handleSave = (formData) => {
    // API call to save
    console.log('Saving venue:', formData);
    setModalOpen(false);
    setSelectedVenue(null);
    fetchVenues();
  };

  const filteredVenues = venues.filter(v => 
    v.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.shortName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Venues</h1>
          <p className="text-slate-500">Manage your hotel properties</p>
        </div>
        <button 
          onClick={() => { setSelectedVenue(null); setModalOpen(true); }}
          className="btn btn-primary"
        >
          <Plus size={20} />
          Add Venue
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 flex items-center gap-3 bg-slate-800/50 rounded-lg px-3 py-2">
          <Search size={18} className="text-slate-500" />
          <input 
            type="text"
            placeholder="Search venues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-slate-300 placeholder-slate-500 w-full"
          />
        </div>
        <button className="btn btn-ghost">
          <Filter size={18} />
          Filters
        </button>
      </div>

      {/* Venues List */}
      <div className="space-y-3">
        {filteredVenues.length > 0 ? (
          filteredVenues.map((venue, index) => (
            <VenueRow 
              key={venue.id || index}
              venue={venue}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        ) : (
          <div className="card p-8 text-center">
            <Building2 size={48} className="mx-auto text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No venues found</h3>
            <p className="text-slate-500 mb-4">Get started by adding your first venue</p>
            <button 
              onClick={() => setModalOpen(true)}
              className="btn btn-primary mx-auto"
            >
              <Plus size={20} />
              Add Venue
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      <VenueModal
        venue={selectedVenue}
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedVenue(null); }}
        onSave={handleSave}
      />
    </div>
  );
}
