import React from 'react';
import { getVertSvgGeometry, VERT_SVG_SCALE, VERT_PAD, REGIONS } from '../../data/anatomy';
import { t } from '../../i18n/i18n';

interface SpineVertebraProps {
    label: string;
    type: string;
    height: number;
    isCorpectomy: boolean;
    heightScale?: number;
}

export const SpineVertebra = ({ label, type, height, isCorpectomy, heightScale = 1 }: SpineVertebraProps) => {
    const common = { fill: REGIONS[type].color, stroke: "#94a3b8", strokeWidth: "1" };
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
                {type === 'Oc' && geom && geom.region === 'occiput' && (() => {
                    const g = geom;
                    const t = VERT_PAD;
                    const b = height - VERT_PAD;
                    const m = (t + b) / 2;
                    return (
                        <g>
                            {/* Skull base — wide convex arc */}
                            <path d={`M${g.left},${b} Q${g.cx},${t - 8} ${g.right},${b} L${g.right},${b} Q${g.cx},${m + 4} ${g.left},${b} Z`}
                                {...common} />
                            {/* Occipital condyles */}
                            <ellipse cx={g.condyleLeftCx} cy={b - g.condyleRy} rx={g.condyleRx} ry={g.condyleRy}
                                fill="#e8ecf0" stroke="#94a3b8" strokeWidth="1" />
                            <ellipse cx={g.condyleRightCx} cy={b - g.condyleRy} rx={g.condyleRx} ry={g.condyleRy}
                                fill="#e8ecf0" stroke="#94a3b8" strokeWidth="1" />
                            {/* Foramen magnum */}
                            <ellipse cx={g.cx} cy={m} rx={g.foramenRx} ry={g.foramenRy}
                                fill="white" stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="3 2" />
                        </g>
                    );
                })()}

                {type === 'C' && geom && geom.region === 'cervical-upper' && label === 'C1' && (() => {
                    const g = geom;
                    const t = VERT_PAD;
                    const b = height - VERT_PAD;
                    const m = (t + b) / 2;
                    return (
                        <g>
                            {/* Posterior arch — left and right arcs */}
                            <path d={`M${g.latMassLeftCx + g.latMassRx},${m} Q${g.cx},${t} ${g.cx - 6},${m}`} fill="none" stroke="#94a3b8" strokeWidth="1.5" />
                            <path d={`M${g.latMassRightCx - g.latMassRx},${m} Q${g.cx},${t} ${g.cx + 6},${m}`} fill="none" stroke="#94a3b8" strokeWidth="1.5" />
                            {/* Posterior tubercle */}
                            <rect x={g.cx - 5} y={m - 5} width={10} height={10} rx={3} fill={common.fill} stroke="#94a3b8" strokeWidth="1.5" />
                            {/* Lateral masses — rounded rectangles */}
                            <rect x={g.latMassLeftCx - g.latMassRx} y={g.latMassCy - g.latMassRy}
                                width={g.latMassRx * 2} height={g.latMassRy * 2} rx={4}
                                fill={common.fill} stroke="#94a3b8" strokeWidth="1.5" />
                            <rect x={g.latMassRightCx - g.latMassRx} y={g.latMassCy - g.latMassRy}
                                width={g.latMassRx * 2} height={g.latMassRy * 2} rx={4}
                                fill={common.fill} stroke="#94a3b8" strokeWidth="1.5" />
                        </g>
                    );
                })()}

                {type === 'C' && geom && geom.region === 'cervical-upper' && label === 'C2' && (() => {
                    const g = geom;
                    const t = VERT_PAD;
                    const b = height - VERT_PAD;
                    const c = 3;
                    return (
                        <g>
                            {/* Vertebral body */}
                            <rect x={g.left} y={t} width={g.bw} height={b - t} rx={c} {...common} />
                            {/* Pars interarticularis — rounded rectangles */}
                            <rect x={g.latMassLeftCx - g.latMassRx} y={g.latMassCy - g.latMassRy}
                                width={g.latMassRx * 2} height={g.latMassRy * 2} rx={3}
                                fill={common.fill} stroke="#94a3b8" strokeWidth="1.5" />
                            <rect x={g.latMassRightCx - g.latMassRx} y={g.latMassCy - g.latMassRy}
                                width={g.latMassRx * 2} height={g.latMassRy * 2} rx={3}
                                fill={common.fill} stroke="#94a3b8" strokeWidth="1.5" />
                        </g>
                    );
                })()}

                {type === 'C' && geom && geom.region === 'cervical-subaxial' && !geom.pedRx && (() => {
                    const g = geom;
                    const t = VERT_PAD;
                    const b = height - VERT_PAD;
                    const c = 3;
                    const w = 1.5;
                    const m = (t + b) / 2;
                    const endCurve = 1.5;
                    const bodyPath = `M${g.left},${t+c} Q${g.left},${t} ${g.left+c},${t} Q${g.cx},${t+endCurve} ${g.right-c},${t} Q${g.right},${t} ${g.right},${t+c} Q${g.right-w},${m} ${g.right},${b-c} Q${g.right},${b} ${g.right-c},${b} Q${g.cx},${b-endCurve} ${g.left+c},${b} Q${g.left},${b} ${g.left},${b-c} Q${g.left+w},${m} ${g.left},${t+c} Z`;
                    return (
                        <g>
                            <path d={bodyPath} {...common} />
                            <rect x={g.latMassLeftCx - g.latMassRx} y={g.latMassCy - g.latMassRy}
                                width={g.latMassRx * 2} height={g.latMassRy * 2} rx={4}
                                fill={common.fill} stroke="#94a3b8" strokeWidth="1" />
                            <rect x={g.latMassRightCx - g.latMassRx} y={g.latMassCy - g.latMassRy}
                                width={g.latMassRx * 2} height={g.latMassRy * 2} rx={4}
                                fill={common.fill} stroke="#94a3b8" strokeWidth="1" />
                        </g>
                    );
                })()}

                {type === 'C' && geom && geom.region === 'cervical-subaxial' && !!geom.pedRx && (() => {
                    const g = geom;
                    const t = VERT_PAD;
                    const b = height - VERT_PAD;
                    const c = 3;
                    const w = 2;
                    const m = (t + b) / 2;
                    const endCurve = 1.5;
                    const bodyPath = `M${g.left},${t+c} Q${g.left},${t} ${g.left+c},${t} Q${g.cx},${t+endCurve} ${g.right-c},${t} Q${g.right},${t} ${g.right},${t+c} Q${g.right-w},${m} ${g.right},${b-c} Q${g.right},${b} ${g.right-c},${b} Q${g.cx},${b-endCurve} ${g.left+c},${b} Q${g.left},${b} ${g.left},${b-c} Q${g.left+w},${m} ${g.left},${t+c} Z`;
                    return (
                        <g>
                            <path d={bodyPath} {...common} />
                            <rect x={g.latMassLeftCx - g.latMassRx} y={g.latMassCy - g.latMassRy}
                                width={g.latMassRx * 2} height={g.latMassRy * 2} rx={4}
                                fill={common.fill} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 2" />
                            <rect x={g.latMassRightCx - g.latMassRx} y={g.latMassCy - g.latMassRy}
                                width={g.latMassRx * 2} height={g.latMassRy * 2} rx={4}
                                fill={common.fill} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 2" />
                            {g.pedLeftCx && g.pedRx && g.pedRy && (
                                <>
                                    <ellipse cx={g.pedLeftCx} cy={m} rx={g.pedRx} ry={g.pedRy}
                                        fill="none" stroke="#94a3b8" strokeWidth="1" />
                                    <ellipse cx={g.pedRightCx} cy={m} rx={g.pedRx} ry={g.pedRy}
                                        fill="none" stroke="#94a3b8" strokeWidth="1" />
                                </>
                            )}
                        </g>
                    );
                })()}

                {(type === 'T' || type === 'L') && geom && (geom.region === 'thoracic' || geom.region === 'lumbar') && (() => {
                    const l = geom.left, r = geom.right;
                    const isT = type === 'T';
                    const c = isT ? 3 : 4; // corner radius
                    const w = isT ? 2 : 3; // waist indent
                    const t = VERT_PAD; // top of body
                    const b = height - VERT_PAD; // bottom of body
                    const m = (t + b) / 2; // midpoint for waist
                    const endCurve = isT ? 2 : 2; // endplate concavity
                    const bodyPath = `M${l},${t+c} Q${l},${t} ${l+c},${t} Q80,${t+endCurve} ${r-c},${t} Q${r},${t} ${r},${t+c} Q${r-w},${m} ${r},${b-c} Q${r},${b} ${r-c},${b} Q80,${b-endCurve} ${l+c},${b} Q${l},${b} ${l},${b-c} Q${l+w},${m} ${l},${t+c} Z`;
                    const pedCy = geom.pedCy;
                    const pedStroke = isT ? "#94a3b8" : "#64748b";
                    const pedWidth = isT ? "1" : "1.5";
                    // Transverse processes — fill only, constant-height rectangles at pedicle level
                    const tpH = geom.pedRy * 1.6; // TP craniocaudal height ~= pedicle height
                    const tpTop = pedCy - tpH;
                    const tpBot = pedCy + tpH;
                    return (
                        <g>
                            {/* Transverse processes (behind body, at pedicle level) */}
                            <rect x={geom.tpLeftX} y={tpTop} width={l - geom.tpLeftX} height={tpBot - tpTop} rx={2}
                                fill={common.fill} />
                            <rect x={r} y={tpTop} width={geom.tpRightX - r} height={tpBot - tpTop} rx={2}
                                fill={common.fill} />
                            <path d={bodyPath} {...common} />
                            <ellipse cx={geom.pedLeftCx} cy={pedCy} rx={geom.pedRx} ry={geom.pedRy} fill="none" stroke={pedStroke} strokeWidth={pedWidth}/>
                            <ellipse cx={geom.pedRightCx} cy={pedCy} rx={geom.pedRx} ry={geom.pedRy} fill="none" stroke={pedStroke} strokeWidth={pedWidth}/>
                        </g>
                    );
                })()}

                {type === 'S' && geom && geom.region === 'sacral' && (() => {
                    const t = VERT_PAD;
                    const b = height - VERT_PAD;
                    // S1 narrows to ~85% at bottom (S1/S2 junction), S2 narrows to ~80%
                    const narrowFrac = label === 'S1' ? 0.85 : 0.80;
                    const bLeft = 80 - (80 - geom.left) * narrowFrac;
                    const bRight = 80 + (geom.right - 80) * narrowFrac;
                    // Dorsal sacral foramina — ~38mm apart for S1, ~27mm for S2 (scaled)
                    const foramenSpacingMm = label === 'S1' ? 38 : 27;
                    const foramenSpacing = foramenSpacingMm * VERT_SVG_SCALE / 2;
                    const foramenY = t + (b - t) * 0.7;
                    const foramenRx = label === 'S1' ? 5 : 4.5;
                    const foramenRy = label === 'S1' ? 3.5 : 3;
                    return (
                        <g>
                            <path d={`M${geom.left},${t} Q80,${t-4} ${geom.right},${t} L${bRight},${b} Q80,${b+4} ${bLeft},${b} Z`} {...common} />
                            {/* Dorsal sacral foramina */}
                            <ellipse cx={80 - foramenSpacing} cy={foramenY} rx={foramenRx} ry={foramenRy} fill="none" stroke="#94a3b8" strokeWidth={1} />
                            <ellipse cx={80 + foramenSpacing} cy={foramenY} rx={foramenRx} ry={foramenRy} fill="none" stroke="#94a3b8" strokeWidth={1} />
                        </g>
                    );
                })()}
                {type === 'Pelvis' && <rect x="25" y={VERT_PAD} width="110" height={height - VERT_PAD * 2} rx="3" {...common} opacity="0.6" />}
            </g>
            <text x="80" y={height/2} dominantBaseline="middle" textAnchor="middle" fontSize={Math.min(18, Math.max(12, 12 / Math.max(0.5, heightScale)))} fontWeight="bold" fill="#1e293b" className="font-sans pointer-events-none select-none">{label}</text>
        </svg>
    );
};
