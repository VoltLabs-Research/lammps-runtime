export type RunState =
  | 'created'
  | 'preparing'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ID = string;

export const nowISO = () => {
    return new Date().toISOString();
};