export interface TimelineBlock {
  id: string;
  resourceId: string;
  title: string;
  notes: string | null;
  holderName: string;
  initials: string;
  mine: boolean;
  startsAtLocal: string;
  endsAtLocal: string;
  timeLabel: string;
  leftPct: number;
  widthPct: number;
  canEdit: boolean;
  canCancel: boolean;
  canViewHistory: boolean;
  startLocked: boolean;
}

export interface TimelineRow {
  id: string;
  name: string;
  categoryLabel: string;
  archived: boolean;
  blocks: TimelineBlock[];
}