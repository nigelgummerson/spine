import React from 'react';
import { t } from '../../i18n/i18n';

interface InstrumentIconProps {
    type: string;
    className?: string;
    color?: string;
    side?: 'left' | 'right';
}

interface HookBaseProps {
    direction: 'up' | 'down';
    label: string;
}

export const InstrumentIcon = React.memo(({ type, className = "w-5 h-5", color = "black", side }: InstrumentIconProps) => {
    const strokeWidth = 2.5;
    // Arrow nearest spine: for right-side placements arrow is on left (default),
    // for left-side placements arrow is on right (mirrored)
    const mirrored = side === 'left';
    const HookBase = ({ direction, label }: HookBaseProps) => {
        const cx = mirrored ? 28 : 12;
        const tx = mirrored ? 18 : 22;
        const anchor = mirrored ? 'end' : 'start';
        const arrowPath = direction === 'up'
            ? `M${cx} 18V6m0 0l-4 4m4-4l4 4m-8 12h8`
            : `M${cx} 6v12m0 0l-4-4m4 4l4-4m-8-12h8`;
        return (
            <svg viewBox="0 0 40 24" className={className} overflow="visible">
                <path d={arrowPath} stroke={color} fill="none" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
                <text x={tx} y="17" fontSize="14" fontWeight="bold" fontFamily="serif" fill={color} textAnchor={anchor}>{label}</text>
            </svg>
        );
    };
    switch (type) {
        // ... Implants ...
        case 'monoaxial': return <svg viewBox="0 0 24 24" className={className} stroke={color} fill="none" strokeWidth={strokeWidth}><circle cx="12" cy="12" r="9" /></svg>;
        case 'polyaxial': return <svg viewBox="0 0 24 24" className={className} stroke={color} fill="none" strokeWidth={strokeWidth}><circle cx="12" cy="12" r="9" /><path d="M7 7l10 10M17 7l-10 10" /></svg>;
        case 'uniplanar': return <svg viewBox="0 0 24 24" className={className} stroke={color} fill="none" strokeWidth={strokeWidth}><circle cx="12" cy="12" r="9" /><path d="M12 3v18" /></svg>;
        case 'pedicle_hook': return <HookBase direction="up" label="P" />;
        case 'tp_hook': return <HookBase direction="down" label="TP" />;
        case 'tp_hook_up': return <HookBase direction="up" label="TP" />;
        case 'sl_hook': return <HookBase direction="down" label="SL" />;
        case 'il_hook': return <HookBase direction="up" label="IL" />;
        case 'band': return <svg viewBox="0 0 36 24" className={className} overflow="visible"><text x="18" y="19" textAnchor="middle" fontSize="22" fontWeight="bold" fill={color} fontFamily="Inter, sans-serif">BAND</text></svg>;
        case 'wire': return <svg viewBox="0 0 36 24" className={className} overflow="visible"><text x="18" y="19" textAnchor="middle" fontSize="22" fontWeight="bold" fill={color} fontFamily="Inter, sans-serif">WIRE</text></svg>;
        case 'cable': return <svg viewBox="0 0 36 24" className={className} overflow="visible"><text x="18" y="19" textAnchor="middle" fontSize="20" fontWeight="bold" fill={color} fontFamily="Inter, sans-serif">CABLE</text></svg>;
        case 'connector': return <svg viewBox="0 0 40 10" className={className} stroke={color} fill="none" strokeWidth="2"><line x1="2" y1="5" x2="38" y2="5" strokeWidth="3" /><circle cx="2" cy="5" r="2" fill={color} /><circle cx="38" cy="5" r="2" fill={color} /></svg>;
        case 'unstable': return <svg viewBox="0 0 24 24" className={`${className} bg-white rounded border border-red-100 shadow-sm`} fill="none" stroke="#dc2626" strokeWidth="2.5"><path d="M2 12 L6 8 L10 16 L14 8 L18 16 L22 12" strokeLinecap="round" strokeLinejoin="round" /><path d="M2 12 L6 8 L10 16 L14 8 L18 16 L22 12" stroke="#7f1d1d" strokeWidth="0.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>;
        case 'osteotomy': return <svg viewBox="0 0 24 24" className={className} stroke={color} fill="none" strokeWidth={strokeWidth}><path d="M2 12h20M12 2l10 10-10 10L2 12z" fill="#d97706" opacity="0.8" stroke="#78350f" strokeWidth="1" /></svg>;
        
        // --- Cages ---
        case 'cage': return <svg viewBox="0 0 24 24" className={className} fill="#0284c7" stroke="none"><rect x="4" y="8" width="16" height="8" rx="2" /></svg>;
        case 'acdf': return <svg viewBox="0 0 24 24" className={className} fill="#0284c7" stroke="none"><path d="M6 8h12v8H6z" /></svg>; 
        case 'plif': return <svg viewBox="0 0 24 24" className={className} fill="#0284c7" stroke="none"><rect x="3" y="8" width="7" height="8" /><rect x="14" y="8" width="7" height="8" /></svg>;
        case 'tlif': return <svg viewBox="0 0 24 24" className={className} fill="#0284c7" stroke="none"><path d="M4 12c0-4 8-8 8-8s8 4 8 8-8 8-8 8-8-4-8-8z" /></svg>;
        case 'xlif': return <svg viewBox="0 0 24 24" className={className} fill="#0284c7" stroke="none"><rect x="2" y="10" width="20" height="4" rx="1" /></svg>;
        case 'olif': return <svg viewBox="0 0 24 24" className={className} fill="#0284c7" stroke="none"><ellipse cx="12" cy="12" rx="10" ry="6" /></svg>;
        case 'alif': return <svg viewBox="0 0 24 24" className={className} fill="#0284c7" stroke="none"><ellipse cx="12" cy="12" rx="10" ry="6" /></svg>;
        
        // --- Forces ---
        case 'translate_left': return <svg viewBox="0 0 24 24" className={className} fill="#2563eb" stroke="none"><path d="M20 12H4M4 12l8-8M4 12l8 8" stroke="#2563eb" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>; 
        case 'translate_right': return <svg viewBox="0 0 24 24" className={className} fill="#2563eb" stroke="none"><path d="M4 12h16M20 12l-8-8M20 12l-8 8" stroke="#2563eb" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>; 
        case 'derotate_cw': return <svg viewBox="0 0 24 24" className={className} stroke="#2563eb" fill="none" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>;
        case 'derotate_ccw': return <svg viewBox="0 0 24 24" className={className} stroke="#2563eb" fill="none" strokeWidth="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>;
        case 'compression': return <svg viewBox="0 0 24 24" className={className} stroke="#2563eb" fill="none" strokeWidth="3"><path d="M12 2v8m-4-4 4 4 4-4" /><path d="M12 22v-8m4 4-4-4-4 4" /></svg>; 
        case 'distraction': return <svg viewBox="0 0 24 24" className={className} stroke="#2563eb" fill="none" strokeWidth="3"><path d="M12 10V2m4 4-4-4-4 4" /><path d="M12 14v8m-4-4 4 4 4-4" /></svg>;

        // --- Mode ---
        case 'implant': return <svg viewBox="0 0 24 24" className={className} stroke={color} fill="none" strokeWidth={strokeWidth}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /></svg>;

        // --- Annotations ---
        case 'note': return <svg viewBox="0 0 24 24" className={className} stroke={color} fill="none" strokeWidth={strokeWidth}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
        default: return null;
    }
});
