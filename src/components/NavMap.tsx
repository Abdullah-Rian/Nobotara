import React from 'react';
import { ARTIFACTS, LASER_STATION, OBJECTIVE_MARKER, ALL_MARKERS } from '../data/artifactsData';
import { ArtifactId, MarkerId, ObjectiveStep, RoverTelemetry } from '../types/game';

const SIZE = 168;
const MIN_SPAN = 90;
const RETURN_DISTANCE = 80;

const MARKER_LABEL: Record<MarkerId, string> = {
  descent_stage: 'EAGLE',
  retroreflector: 'RETRO',
  laser_station: 'RANGE',
  plaque: 'PLAQUE'
};

interface NavMapProps {
  telemetry: RoverTelemetry;
  objective: ObjectiveStep;
  artifactsVisited: Record<ArtifactId, boolean>;
  laserCompleted: boolean;
}

function markerPoint(id: MarkerId): { x: number; z: number } {
  if (id === 'laser_station') {
    return { x: LASER_STATION.position[0], z: LASER_STATION.position[2] };
  }
  const [x, , z] = ARTIFACTS[id].markerPosition;
  return { x, z };
}

function markerVisited(
  id: MarkerId,
  artifactsVisited: Record<ArtifactId, boolean>,
  laserCompleted: boolean
): boolean {
  if (id === 'laser_station') return laserCompleted;
  return artifactsVisited[id];
}

export const NavMap: React.FC<NavMapProps> = ({
  telemetry,
  objective,
  artifactsVisited,
  laserCompleted
}) => {
  const rover = telemetry.position;
  const lander = telemetry.lander;
  const markerIds = objective === 'free' ? ALL_MARKERS : [OBJECTIVE_MARKER[objective]];
  const markers = markerIds.map(id => ({ id, ...markerPoint(id) }));
  const landerDist = Math.hypot(rover.x - lander.x, rover.z - lander.z);
  const returning = objective === 'free' && landerDist > RETURN_DISTANCE;

  let minX = Math.min(rover.x, lander.x);
  let maxX = Math.max(rover.x, lander.x);
  let minZ = Math.min(rover.z, lander.z);
  let maxZ = Math.max(rover.z, lander.z);
  for (const marker of markers) {
    minX = Math.min(minX, marker.x);
    maxX = Math.max(maxX, marker.x);
    minZ = Math.min(minZ, marker.z);
    maxZ = Math.max(maxZ, marker.z);
  }

  const span = Math.max(MIN_SPAN, Math.max(maxX - minX, maxZ - minZ) * 1.35);
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const scale = (SIZE - 20) / span;
  const toX = (x: number) => SIZE / 2 + (x - centerX) * scale;
  const toY = (z: number) => SIZE / 2 - (z - centerZ) * scale;
  const heading = ((telemetry.heading % 360) + 360) % 360;
  const roverX = toX(rover.x);
  const roverY = toY(rover.z);
  const landerX = toX(lander.x);
  const landerY = toY(lander.z);

  return (
    <div className="w-[168px] h-[168px] rounded-lg border border-slate-800/80 bg-slate-950/85 overflow-hidden shadow-lg">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-full" role="img" aria-label="Navigation map">
        {telemetry.rangeRadius > 0 && (
          <circle
            cx={landerX}
            cy={landerY}
            r={telemetry.rangeRadius * scale}
            fill="rgba(251, 191, 36, 0.05)"
            stroke="rgba(148, 163, 184, 0.55)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}

        {markers.map(marker => {
          const visited = markerVisited(marker.id, artifactsVisited, laserCompleted);
          const guided = objective !== 'free';
          return (
            <g key={marker.id}>
              <circle
                cx={toX(marker.x)}
                cy={toY(marker.z)}
                r={guided ? 4.5 : 3.5}
                fill={visited ? '#34d399' : '#e2e8f0'}
                stroke={guided ? '#34d399' : 'none'}
                strokeWidth={guided ? 1.5 : 0}
              />
              {guided && (
                <text
                  x={toX(marker.x)}
                  y={toY(marker.z) - 8}
                  textAnchor="middle"
                  fill="#cbd5e1"
                  fontSize="8"
                  fontFamily="ui-monospace, monospace"
                >
                  {MARKER_LABEL[marker.id]}
                </text>
              )}
            </g>
          );
        })}

        <g className={returning ? 'animate-pulse' : undefined}>
          <rect
            x={landerX - 4}
            y={landerY - 4}
            width="8"
            height="8"
            fill="#fbbf24"
            transform={`rotate(45 ${landerX} ${landerY})`}
          />
          {returning && (
            <text
              x={landerX}
              y={landerY + 16}
              textAnchor="middle"
              fill="#fbbf24"
              fontSize="8"
              fontFamily="ui-monospace, monospace"
            >
              RETURN
            </text>
          )}
        </g>

        <g transform={`translate(${roverX} ${roverY}) rotate(${heading})`}>
          <polygon points="0,-8 5.5,6 -5.5,6" fill="#f8fafc" />
        </g>
      </svg>
    </div>
  );
};
