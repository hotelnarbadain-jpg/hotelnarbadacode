import { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBox, faChartPie, faExclamationTriangle, faSearch, faWarehouse } from '@fortawesome/free-solid-svg-icons';
import PageHeader from '../components/common/PageHeader';
import { TableSkeleton } from '../components/common/Skeleton';

export default function StockManagementPage({ api, updateTrigger }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.fetchList('/inventory-items');
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [updateTrigger]);

  const filteredItems = useMemo(() => {
    const query = search.toLowerCase();
    return items.filter(item => 
      [item.name, item.category].some(val => (val || '').toLowerCase().includes(query))
    );
  }, [items, search]);

  const stats = useMemo(() => {
    return {
      totalItems: items.length,
      lowStock: items.filter(i => i.stock <= 5).length,
      outOfStock: items.filter(i => i.stock <= 0).length,
      totalStockValue: items.reduce((sum, i) => sum + i.stock, 0)
    };
  }, [items]);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Stock Management" 
        actions={
          <div className="relative">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input 
              className="input pl-10 w-[300px]" 
              placeholder="Filter stock..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
        }
      />

      {loading ? (
        <TableSkeleton columns={5} />
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <div className="card p-6 border-l-4 border-l-blue-500">
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-content-center rounded-xl bg-blue-50 text-blue-600">
                  <FontAwesomeIcon icon={faWarehouse} />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-brand-muted uppercase">Total Items</p>
                  <h3 className="text-[24px] font-black">{stats.totalItems}</h3>
                </div>
              </div>
            </div>

            <div className="card p-6 border-l-4 border-l-amber-500">
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-content-center rounded-xl bg-amber-50 text-amber-600">
                  <FontAwesomeIcon icon={faExclamationTriangle} />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-brand-muted uppercase">Low Stock</p>
                  <h3 className="text-[24px] font-black text-amber-600">{stats.lowStock}</h3>
                </div>
              </div>
            </div>

            <div className="card p-6 border-l-4 border-l-rose-500">
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-content-center rounded-xl bg-rose-50 text-rose-600">
                  <FontAwesomeIcon icon={faBox} />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-brand-muted uppercase">Out of Stock</p>
                  <h3 className="text-[24px] font-black text-rose-600">{stats.outOfStock}</h3>
                </div>
              </div>
            </div>

            <div className="card p-6 border-l-4 border-l-emerald-500">
              <div className="flex items-center gap-4">
                <div className="grid h-12 w-12 place-content-center rounded-xl bg-emerald-50 text-emerald-600">
                  <FontAwesomeIcon icon={faChartPie} />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-brand-muted uppercase">Total Units</p>
                  <h3 className="text-[24px] font-black">{stats.totalStockValue}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-brand-border bg-slate-50/50 px-6 py-4">
              <h3 className="text-[14px] font-bold uppercase tracking-wider text-brand-text">Stock Inventory List</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-slate-50 text-brand-muted uppercase text-[11px] font-black tracking-widest border-b border-brand-border">
                  <tr>
                    <th className="px-6 py-4">Item Name</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4 text-center">Unit</th>
                    <th className="px-6 py-4 text-right">Selling Price</th>
                    <th className="px-6 py-4 text-right">Current Stock</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {filteredItems.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-brand-text uppercase">{item.name}</td>
                      <td className="px-6 py-4 text-brand-muted">{item.category || 'N/A'}</td>
                      <td className="px-6 py-4 text-center">{item.unit}</td>
                      <td className="px-6 py-4 text-right font-bold text-brand-blue">Rs. {Number(item.sellingPrice || 0).toLocaleString()}</td>
                      <td className={`px-6 py-4 text-right font-black text-[16px] ${item.stock <= 5 ? 'text-rose-500' : 'text-emerald-600'}`}>
                        {item.stock}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {item.stock <= 0 ? (
                          <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 uppercase">Out of Stock</span>
                        ) : item.stock <= 5 ? (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 uppercase">Low Stock</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 uppercase">In Stock</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-brand-muted">
                        No items found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
