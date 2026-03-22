import React, { useState, useRef, useEffect } from 'react';
import { t } from '../i18n/i18n';
import { SCREW_SYSTEMS } from '../data/implants';

export const ScrewSystemCombo = ({ value, onChange, company, placeholder }) => {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [filter, setFilter] = useState('');
    const ref = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setEditing(false); } };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

    const companySystems = company && SCREW_SYSTEMS[company] ? SCREW_SYSTEMS[company] : [];
    const otherSystems = Object.entries(SCREW_SYSTEMS).filter(([k]) => k !== company).flatMap(([k, v]) => v.map(s => ({ name: s, company: k })));
    const seen = new Set(companySystems);
    const uniqueOther = otherSystems.filter(s => { if (seen.has(s.name)) return false; seen.add(s.name); return true; });

    const q = filter.toLowerCase();
    const matchedCompany = companySystems.filter(s => s.toLowerCase().includes(q));
    const matchedOther = uniqueOther.filter(s => s.name.toLowerCase().includes(q) || s.company.toLowerCase().includes(q));

    return (
        <div ref={ref} className="relative">
            {editing ? (
                <input ref={inputRef} type="text" className="editable-field w-full text-xs" value={value} placeholder={placeholder} onChange={e => { onChange(e.target.value); setFilter(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
            ) : (
                <div className="editable-field w-full text-xs cursor-pointer" style={{ whiteSpace: 'normal', wordBreak: 'break-word' }} onClick={() => { setEditing(true); setOpen(true); }}>{value || <span style={{ color: '#6b7280' }}>{placeholder}</span>}</div>
            )}
            {open && (matchedCompany.length > 0 || matchedOther.length > 0) && (
                <div className="absolute z-50 left-0 right-0 top-full mt-0.5 bg-white border border-slate-300 rounded shadow-lg max-h-48 overflow-y-auto text-xs">
                    {matchedCompany.length > 0 && <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase bg-slate-50">{company}</div>}
                    {matchedCompany.map(s => <div key={s} className="px-2 py-1.5 cursor-pointer hover:bg-amber-50 font-semibold text-slate-800" onClick={() => { onChange(s); setFilter(''); setOpen(false); }}>{s}</div>)}
                    {matchedOther.length > 0 && <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase bg-slate-50 border-t border-slate-200">{t('patient.other_companies')}</div>}
                    {matchedOther.map(s => <div key={`${s.company}-${s.name}`} className="px-2 py-1.5 cursor-pointer hover:bg-slate-50 text-slate-600 flex justify-between" onClick={() => { onChange(s.name); setFilter(''); setOpen(false); }}><span>{s.name}</span><span className="text-slate-400 text-[10px]">{s.company}</span></div>)}
                </div>
            )}
        </div>
    );
};
