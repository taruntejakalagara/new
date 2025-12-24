import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  ChevronRight,
  MapPin,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { API_BASE_URL, getCurrentEST } from '../config/api';

export default function VenuesPage() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/venues`);
      const data = await response.json();
      
      if (data.success && data.venues) {
        setVenues(data.venues);
      } else {
        // Demo venues
        setVenues([
          { id: 1, name: 'Fairmont Pittsburgh', address: '510 Market St, Pittsburgh, PA', status: 'active' },
          { id: 2, name: 'The Westin Convention Center', address: '1000 Penn Ave, Pittsburgh, PA', status: 'active' },
          { id: 3, name: 'Omni William Penn', address: '530 William Penn Pl, Pittsburgh, PA', status: 'inactive' }
        ]);
      }
    } catch (error) {
      console.error('Error fetching venues:', error);
      setVenues([
        { id: 1, name: 'Fairmont Pittsburgh', address: '510 Market St, Pittsburgh, PA', status: 'active' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredVenues = venues.filter(venue =>
    venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    venue.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="venues-page">
      <header className="page-header">
        <div>
          <h1>Venues</h1>
          <p>Manage all valet locations</p>
        </div>
        <button className="add-btn" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          Add Venue
        </button>
      </header>

      {/* Search */}
      <div className="search-bar">
        <Search size={18} />
        <input
          type="text"
          placeholder="Search venues..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Venues List */}
      <div className="venues-list">
        {filteredVenues.map(venue => (
          <div key={venue.id} className="venue-row">
            <div className="venue-icon">
              <Building2 size={20} />
            </div>
            <div className="venue-info" onClick={() => navigate(`/venues/${venue.id}`)}>
              <h3>{venue.name}</h3>
              <p>
                <MapPin size={14} />
                {venue.address}
              </p>
            </div>
            <div className={`status ${venue.status}`}>
              {venue.status === 'active' ? <CheckCircle size={14} /> : <XCircle size={14} />}
              {venue.status}
            </div>
            <div className="actions">
              <button className="action-btn" onClick={() => {
                setEditingVenue(venue);
                setShowModal(true);
              }}>
                <Edit2 size={16} />
              </button>
              <button className="action-btn delete">
                <Trash2 size={16} />
              </button>
              <button className="action-btn view" onClick={() => navigate(`/venues/${venue.id}`)}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .venues-page {
          padding: 2rem;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
        }

        .page-header h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
        }

        .page-header p {
          color: #64748b;
          font-size: 0.875rem;
        }

        .add-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .add-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .search-bar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: white;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          margin-bottom: 1.5rem;
        }

        .search-bar svg {
          color: #9ca3af;
        }

        .search-bar input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 0.9375rem;
        }

        .venues-list {
          background: white;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          overflow: hidden;
        }

        .venue-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid #f1f5f9;
          transition: background 0.2s;
        }

        .venue-row:last-child {
          border-bottom: none;
        }

        .venue-row:hover {
          background: #f8fafc;
        }

        .venue-icon {
          width: 42px;
          height: 42px;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .venue-info {
          flex: 1;
          cursor: pointer;
        }

        .venue-info h3 {
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.25rem;
        }

        .venue-info p {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          color: #64748b;
          font-size: 0.8125rem;
        }

        .status {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.75rem;
          border-radius: 6px;
          font-size: 0.8125rem;
          font-weight: 500;
          text-transform: capitalize;
        }

        .status.active {
          background: #dcfce7;
          color: #16a34a;
        }

        .status.inactive {
          background: #f1f5f9;
          color: #64748b;
        }

        .actions {
          display: flex;
          gap: 0.5rem;
        }

        .action-btn {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          border: none;
          border-radius: 6px;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: #e2e8f0;
          color: #1e293b;
        }

        .action-btn.delete:hover {
          background: #fef2f2;
          color: #dc2626;
        }

        .action-btn.view {
          background: #3b82f6;
          color: white;
        }

        .action-btn.view:hover {
          background: #2563eb;
        }
      `}</style>
    </div>
  );
}
