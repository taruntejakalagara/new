import { useState, useEffect } from 'react';
import { 
  Database, Table, RefreshCw, Search, ChevronDown, ChevronRight,
  Eye, Edit2, Trash2, Download, Clock, AlertCircle, CheckCircle
} from 'lucide-react';
import { API_BASE_URL, toEST, getCurrentEST } from '../config/api';

export default function DatabaseExplorerPage() {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [currentTime, setCurrentTime] = useState(getCurrentEST());
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchTables();
    const interval = setInterval(() => setCurrentTime(getCurrentEST()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchTables = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/system/tables`);
      const data = await response.json();
      
      if (data.success && data.tables) {
        setTables(data.tables);
      } else {
        // Demo tables
        setTables([
          { name: 'vehicles', count: 156 },
          { name: 'drivers', count: 12 },
          { name: 'managers', count: 3 },
          { name: 'tickets', count: 1245 },
          { name: 'queue', count: 8 },
          { name: 'settings', count: 15 },
          { name: 'venues', count: 3 },
          { name: 'shifts', count: 45 },
        ]);
      }
    } catch (error) {
      setTables([
        { name: 'vehicles', count: 156 },
        { name: 'drivers', count: 12 },
        { name: 'managers', count: 3 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTableData = async (tableName) => {
    setLoadingData(true);
    setSelectedTable(tableName);
    
    try {
      const response = await fetch(`${API_BASE_URL}/system/tables/${tableName}`);
      const data = await response.json();
      
      if (data.success) {
        setColumns(data.columns || []);
        setTableData(data.rows || []);
      } else {
        generateDemoData(tableName);
      }
    } catch (error) {
      generateDemoData(tableName);
    } finally {
      setLoadingData(false);
    }
  };

  const generateDemoData = (tableName) => {
    const demoData = {
      vehicles: {
        columns: ['id', 'ticket_number', 'license_plate', 'make', 'model', 'color', 'status', 'hook_number', 'checked_in_at'],
        rows: [
          { id: 1, ticket_number: 'A-045', license_plate: 'ABC-1234', make: 'Tesla', model: 'Model 3', color: 'Black', status: 'parked', hook_number: 12, checked_in_at: new Date().toISOString() },
          { id: 2, ticket_number: 'A-044', license_plate: 'XYZ-5678', make: 'BMW', model: 'X5', color: 'White', status: 'parked', hook_number: 8, checked_in_at: new Date(Date.now() - 3600000).toISOString() },
          { id: 3, ticket_number: 'A-043', license_plate: 'DEF-9012', make: 'Mercedes', model: 'GLE', color: 'Silver', status: 'retrieving', hook_number: 15, checked_in_at: new Date(Date.now() - 7200000).toISOString() },
        ]
      },
      drivers: {
        columns: ['id', 'username', 'full_name', 'phone', 'status', 'venue_id', 'created_at'],
        rows: [
          { id: 1, username: 'john_s', full_name: 'John Smith', phone: '555-0101', status: 'active', venue_id: 1, created_at: new Date().toISOString() },
          { id: 2, username: 'mike_j', full_name: 'Mike Johnson', phone: '555-0102', status: 'active', venue_id: 1, created_at: new Date().toISOString() },
          { id: 3, username: 'david_w', full_name: 'David Wilson', phone: '555-0103', status: 'break', venue_id: 2, created_at: new Date().toISOString() },
        ]
      },
      managers: {
        columns: ['id', 'username', 'full_name', 'email', 'role', 'status', 'created_at'],
        rows: [
          { id: 1, username: 'admin', full_name: 'Administrator', email: 'admin@valet.com', role: 'admin', status: 'active', created_at: new Date().toISOString() },
          { id: 2, username: 'manager1', full_name: 'John Manager', email: 'john@valet.com', role: 'manager', status: 'active', created_at: new Date().toISOString() },
        ]
      }
    };

    const data = demoData[tableName] || { columns: ['id', 'name'], rows: [] };
    setColumns(data.columns);
    setTableData(data.rows);
  };

  const deleteRow = async (tableName, id) => {
    if (!confirm(`Delete row ${id} from ${tableName}?`)) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/system/tables/${tableName}/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setMessage({ type: 'success', text: 'Row deleted successfully' });
        fetchTableData(tableName);
      } else {
        setMessage({ type: 'error', text: 'Failed to delete row' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Delete not available in demo mode' });
    }
    
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const exportTable = () => {
    if (!selectedTable || tableData.length === 0) return;
    
    const csv = [
      columns.join(','),
      ...tableData.map(row => columns.map(col => JSON.stringify(row[col] || '')).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredData = tableData.filter(row => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return Object.values(row).some(val => 
      String(val).toLowerCase().includes(query)
    );
  });

  const formatValue = (value, column) => {
    if (value === null || value === undefined) return <span className="null">NULL</span>;
    if (column.includes('_at') || column.includes('timestamp')) {
      return toEST(value);
    }
    if (typeof value === 'boolean') {
      return value ? <CheckCircle size={16} className="text-green" /> : <span className="false">false</span>;
    }
    return String(value);
  };

  return (
    <div className="db-explorer-page">
      <header className="page-header">
        <div>
          <h1>Database Explorer</h1>
          <p className="current-time"><Clock size={14} />{currentTime}</p>
        </div>
        <div className="header-actions">
          {selectedTable && (
            <button className="action-btn" onClick={exportTable}>
              <Download size={18} />
              Export CSV
            </button>
          )}
          <button className="action-btn primary" onClick={fetchTables}>
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <div className="explorer-layout">
        {/* Sidebar - Tables List */}
        <div className="tables-sidebar">
          <h3><Database size={18} /> Tables</h3>
          <div className="tables-list">
            {tables.map((table) => (
              <button
                key={table.name}
                className={`table-item ${selectedTable === table.name ? 'active' : ''}`}
                onClick={() => fetchTableData(table.name)}
              >
                <Table size={16} />
                <span className="table-name">{table.name}</span>
                <span className="table-count">{table.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content - Table Data */}
        <div className="table-content">
          {!selectedTable ? (
            <div className="empty-state">
              <Database size={48} />
              <h3>Select a table</h3>
              <p>Choose a table from the sidebar to view its data</p>
            </div>
          ) : loadingData ? (
            <div className="loading-state">
              <RefreshCw size={32} className="spin" />
              <p>Loading {selectedTable}...</p>
            </div>
          ) : (
            <>
              <div className="table-header">
                <div className="table-info">
                  <h2>{selectedTable}</h2>
                  <span className="row-count">{filteredData.length} rows</span>
                </div>
                <div className="search-box">
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Search in table..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      {columns.map((col) => (
                        <th key={col}>{col}</th>
                      ))}
                      <th className="actions-col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length + 1} className="no-data">
                          No data found
                        </td>
                      </tr>
                    ) : (
                      filteredData.map((row, i) => (
                        <tr key={row.id || i}>
                          {columns.map((col) => (
                            <td key={col}>{formatValue(row[col], col)}</td>
                          ))}
                          <td className="actions-col">
                            <button className="row-action" title="View">
                              <Eye size={14} />
                            </button>
                            <button 
                              className="row-action delete" 
                              title="Delete"
                              onClick={() => deleteRow(selectedTable, row.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        .db-explorer-page { padding: 2rem; height: calc(100vh - 4rem); display: flex; flex-direction: column; }
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
        .page-header h1 { font-size: 1.5rem; font-weight: 700; color: #1e293b; }
        .current-time { display: flex; align-items: center; gap: 0.5rem; color: #64748b; font-size: 0.875rem; }
        .header-actions { display: flex; gap: 0.5rem; }
        .action-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.875rem; background: white; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.875rem; cursor: pointer; }
        .action-btn:hover { background: #f8fafc; }
        .action-btn.primary { background: #3b82f6; color: white; border-color: #3b82f6; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .message { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; }
        .message.success { background: #dcfce7; color: #16a34a; }
        .message.error { background: #fef2f2; color: #dc2626; }

        .explorer-layout { flex: 1; display: flex; gap: 1.5rem; min-height: 0; }
        
        .tables-sidebar { width: 240px; background: white; border-radius: 12px; border: 1px solid #e2e8f0; padding: 1rem; display: flex; flex-direction: column; }
        .tables-sidebar h3 { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; font-weight: 600; color: #64748b; margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid #f1f5f9; }
        .tables-list { flex: 1; overflow-y: auto; }
        .table-item { display: flex; align-items: center; gap: 0.5rem; width: 100%; padding: 0.625rem 0.75rem; background: none; border: none; border-radius: 8px; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; text-align: left; }
        .table-item:hover { background: #f1f5f9; }
        .table-item.active { background: #3b82f6; color: white; }
        .table-item svg { color: #64748b; }
        .table-item.active svg { color: white; }
        .table-name { flex: 1; font-weight: 500; }
        .table-count { font-size: 0.75rem; background: rgba(0,0,0,0.1); padding: 0.125rem 0.5rem; border-radius: 4px; }
        .table-item.active .table-count { background: rgba(255,255,255,0.2); }

        .table-content { flex: 1; background: white; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
        
        .empty-state, .loading-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; }
        .empty-state svg, .loading-state svg { margin-bottom: 1rem; opacity: 0.5; }
        .empty-state h3, .loading-state p { color: #64748b; }

        .table-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid #e2e8f0; }
        .table-info { display: flex; align-items: baseline; gap: 0.75rem; }
        .table-info h2 { font-size: 1.125rem; font-weight: 600; color: #1e293b; }
        .row-count { font-size: 0.8125rem; color: #64748b; }
        .search-box { display: flex; align-items: center; gap: 0.5rem; background: #f8fafc; padding: 0.5rem 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0; }
        .search-box svg { color: #9ca3af; }
        .search-box input { border: none; background: none; outline: none; font-size: 0.875rem; width: 200px; }

        .data-table-container { flex: 1; overflow: auto; }
        .data-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
        .data-table th { position: sticky; top: 0; background: #f8fafc; padding: 0.75rem 1rem; text-align: left; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
        .data-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #f1f5f9; color: #1e293b; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .data-table tr:hover td { background: #f8fafc; }
        .data-table .null { color: #94a3b8; font-style: italic; }
        .data-table .text-green { color: #22c55e; }
        .data-table .false { color: #ef4444; }
        .no-data { text-align: center; color: #94a3b8; padding: 2rem !important; }
        
        .actions-col { width: 80px; text-align: center; }
        .row-action { background: none; border: none; color: #94a3b8; cursor: pointer; padding: 0.25rem; margin: 0 0.125rem; }
        .row-action:hover { color: #3b82f6; }
        .row-action.delete:hover { color: #ef4444; }
      `}</style>
    </div>
  );
}
