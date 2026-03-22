import React from 'react';
import { getVertSvgGeometry, VERT_SVG_SCALE, VERT_PAD, getLevelHeight } from '../../data/anatomy';

export const SpineVertebra = ({ label, type, height, isCorpectomy, heightScale = 1 }) => {
    const common = { fill: REGIONS[type].color, stroke: "#475569", strokeWidth: "1.5" };
    const geom = getVertSvgGeometry(label);

    if (isCorpectomy) {
        const cl = geom ? geom.left : 40;
        const cr = geom ? geom.right : 120;
        return (
            <svg viewBox={`0 0 160 ${height}`} className="w-full h-full block" overflow="visible">
                <line x1="80" y1="0" x2="80" y2={height} stroke="#cbd5e1" strokeDasharray="3 3" />
                <path d={`M${cl},${VERT_PAD} L${cr},${VERT_PAD} L${cr},${height-VERT_PAD} L${cl},${height-VERT_PAD} Z`} fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
                <text x="80" y={height/2} dominantBaseline="middle" textAnchor="middle" fontSize="10" fill="#94a3b8" className="font-sans italic">{t('chart.corpectomy')}</text>
            </svg>
        );
    }

    return (
        <svg viewBox={`0 0 160 ${height}`} className="w-full h-full block" overflow="visible">
            <line x1="80" y1="-2" x2="80" y2={height + 2} stroke="#cbd5e1" strokeDasharray="3 3" />
            <g>
                {type === 'Oc' && <path d="M30,2 Q80,45 130,2 L130,10 Q80,50 30,10 Z" transform={`scale(1, ${height/30})`} {...common} fill="#f1f5f9" />}

                {type === 'C' && (
                    <g transform={`scale(1, ${height/24})`}>
                        <path d="M45,4 Q80,-2 115,4 L120,18 Q80,24 40,18 Z" {...common} />
                    </g>
                )}

                {(type === 'T' || type === 'L') && geom && (() => {
                    const l = geom.left, r = geom.right;
                    const isT = type === 'T';
                    const c = isT ? 3 : 4; // corner radius
                    const w = isT ? 2 : 3; // waist indent
                    const t = VERT_PAD; // top of body
                    const b = height - VERT_PAD; // bottom of body
                    const m = (t + b) / 2; // midpoint for waist
                    const endCurve = isT ? 2 : 2; // endplate concavity
                    // Rounded corners, biconcave endplates & waisted sidewalls
                    const bodyPath = `M${l},${t+c} Q${l},${t} ${l+c},${t} Q80,${t+endCurve} ${r-c},${t} Q${r},${t} ${r},${t+c} Q${r-w},${m} ${r},${b-c} Q${r},${b} ${r-c},${b} Q80,${b-endCurve} ${l+c},${b} Q${l},${b} ${l},${b-c} Q${l+w},${m} ${l},${t+c} Z`;
                    // Pedicle vertical position: centre offset from top of body
                    // Uses pedicle sagittal height (pedRy) to scale position, matching medial-lateral convention
                    const pedCy = t + geom.pedRy + 5;
                    const pedStroke = isT ? "#94a3b8" : "#64748b";
                    const pedWidth = isT ? "1" : "1.5";
                    return (
                        <g>
                            <path d={bodyPath} {...common} />
                            <ellipse cx={geom.pedLeftCx} cy={pedCy} rx={geom.pedRx} ry={geom.pedRy} fill="none" stroke={pedStroke} strokeWidth={pedWidth}/>
                            <ellipse cx={geom.pedRightCx} cy={pedCy} rx={geom.pedRx} ry={geom.pedRy} fill="none" stroke={pedStroke} strokeWidth={pedWidth}/>
                        </g>
                    );
                })()}

                {type === 'S' && geom && (() => {
                    const t = VERT_PAD;
                    const b = height - VERT_PAD;
                    const narrowFrac = 0.6; // sacrum narrows to 60% at bottom
                    return <path d={`M${geom.left},${t} Q80,${t-4} ${geom.right},${t} L${80 + (geom.right-80)*narrowFrac},${b} Q80,${b+4} ${80 - (80-geom.left)*narrowFrac},${b} Z`} {...common} />;
                })()}
                {type === 'Pelvis' && <rect x="25" y={VERT_PAD} width="110" height={height - VERT_PAD * 2} rx="3" {...common} opacity="0.6" />}
            </g>
            <text x="80" y={height/2} dominantBaseline="middle" textAnchor="middle" fontSize={Math.min(14, Math.max(10, 10 / Math.max(0.6, heightScale)))} fontWeight="bold" fill="#334155" className="font-sans pointer-events-none select-none">{label}</text>
        </svg>
    );
};
