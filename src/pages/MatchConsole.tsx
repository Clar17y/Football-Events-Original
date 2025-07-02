import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonToast } from '@ionic/react';
import { play, pause, refresh, football, ribbon, key, shieldCheckmark, checkmarkCircle, closeCircle, warning, flagOutline, medal, sad, removeCircle } from 'ionicons/icons';
import React, { useState, useContext, useEffect, useRef } from 'react';
import { MatchContext } from '../contexts/MatchContext';
import { useTicker } from '../hooks/useTicker';
import EventModal from '../components/EventModal';
import { db } from '../db/indexedDB';

const pad = (n: number) => n.toString().padStart(2, '0');

// Define event button order, icon, color, and label
const EVENT_BUTTONS = [
  { kind: 'goal',        icon: football,         color: 'success', label: 'Goal' },
  { kind: 'assist',      icon: ribbon,           color: 'success', label: 'Assist' },
  { kind: 'key_pass',    icon: key,              color: 'success', label: 'Key Pass' },
  { kind: 'save',        icon: shieldCheckmark,  color: 'success', label: 'Save' },
  { kind: 'ball_won',    icon: checkmarkCircle,  color: 'success', label: 'Ball Won' },
  { kind: 'corner',      icon: flagOutline,      color: 'primary', label: 'Corner' },
  { kind: 'free_kick',   icon: medal,            color: 'primary', label: 'Free Kick' },
  { kind: 'penalty',     icon: ribbon,           color: 'primary', label: 'Penalty' },
  { kind: 'foul',        icon: warning,          color: 'warning', label: 'Foul' },
  { kind: 'ball_lost',   icon: closeCircle,      color: 'danger',  label: 'Ball Lost' },
  { kind: 'own_goal',    icon: sad,              color: 'danger',  label: 'Own Goal' },
  { kind: 'ball_out',    icon: removeCircle,     color: 'medium',  label: 'Ball Out' },
];

const ANONYMOUS_PLAYER = { id: 'anon', full_name: 'Anonymous' };

const MatchConsole: React.FC = () => {
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEventKind, setSelectedEventKind] = useState<string>('goal');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [showTeamSelect, setShowTeamSelect] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const { clock, start, pause: pauseClock, reset } = useContext(MatchContext);
  const [eventLog, setEventLog] = useState<Array<{ kind: string; team: string; player: string; ts: number }>>([]);
  const handleEventSaved = (newEvent: { kind: string; team: string; player: string; ts: number }) => {
    setEventLog(prev => [newEvent, ...prev]);
    setShowToast(true);
  };

  useEffect(() => {
    const loadLogs = async () => {
      const logs = await db.outbox.toArray();
      // Map OutboxEvent[] to the expected shape
      setEventLog(
        logs.map(log => ({
          kind: log.payload.kind,
          team: log.payload.team_id,
          player: log.payload.player_id,
          ts: log.payload.clock_ms,
        }))
      );
    };
    loadLogs();
  }, []);

  const eventsContainerRef = useRef<HTMLDivElement | null>(null);
  // After eventLog changes, scroll to top
  useEffect(() => {
    if (eventsContainerRef.current) {
      eventsContainerRef.current.scrollTop = 0;
    }
  }, [eventLog]);

  useTicker(1000);
  const elapsedMs = clock.running
    ? clock.offsetMs + Date.now() - (clock.startTs ?? 0)
    : clock.offsetMs;

  const mm   = Math.floor(elapsedMs / 60000);
  const ss   = Math.floor((elapsedMs % 60000) / 1000);
  const time = `${pad(mm)}:${pad(ss)}`;

  const isZero   = elapsedMs === 0;
  const isRun    = clock.running;
  const handleToggle = () => (isRun ? pauseClock() : start());
  const toggleContent = isZero && !isRun
    ? <span style={{ color: 'white' }}>Kickoff</span>
    : <IonIcon icon={isRun ? pause : play} style={{ fontSize: '24px', color: 'white' }} />;

  // Add anonymous player to each team
  const ourTeam = { id: '1', name: 'Old Wilsonians', players: [{ id: "1", full_name: "Zane" }, { id: "2", full_name: "Marco" }, ANONYMOUS_PLAYER] };
  const oppTeam = { id: '2', name: 'Unity', players: [ANONYMOUS_PLAYER] };
  const teams = [ourTeam, oppTeam];
  const currentMatchId = '1';
  const currentSeasonId = '2025'; // Replace with actual season id if available
  const currentPeriod = 1;

  // When an event is clicked, prompt for team selection
  const openEventModal = (eventKind: string) => {
    setSelectedEventKind(eventKind);
    setShowTeamSelect(true);
  };

  // After team is selected, show the event modal
  const handleTeamSelect = (teamId: string) => {
    setSelectedTeamId(teamId);
    setShowTeamSelect(false);
    setShowEventModal(true);
  };

  const selectedTeam = teams.find(t => t.id === selectedTeamId)!;

  // Split buttons into logical groups for layout
  const positiveEvents = EVENT_BUTTONS.filter(e => ['goal', 'assist', 'key_pass', 'save', 'ball_won'].includes(e.kind));
  const neutralEvents  = EVENT_BUTTONS.filter(e => ['corner', 'free_kick', 'penalty'].includes(e.kind));
  const negativeEvents = EVENT_BUTTONS.filter(e => ['foul', 'ball_lost', 'own_goal', 'ball_out'].includes(e.kind));

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary" className="ion-justify-content-between">
          <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <IonButton
              shape="round"
              fill="clear"
              onClick={reset}
              slot="start"
            >
              <IonIcon icon={refresh} style={{ fontSize: '24px', color: 'white' }}/>
            </IonButton>
            <IonButton
              shape="round"
              fill="clear"
              onClick={handleToggle}
            >
              {toggleContent}
            </IonButton>
            <IonTitle style={{ margin: 0 }}>{time}</IonTitle>
          </div>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding" style={{ boxSizing: 'border-box', padding: 16, minHeight: '100vh' }}>
        <div style={{ margin: 8 }}>
          {/* Positive Events */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, marginTop: 16 }}>
            {positiveEvents.map(({ kind, icon, color, label }) => (
              <IonButton key={kind} color={color} onClick={() => openEventModal(kind)} style={{ flex: '1 1 180px', minWidth: 140 }}>
                <IonIcon icon={icon} slot="start" style={{ marginRight: 8 }} />
                {label}
              </IonButton>
            ))}
          </div>
          {/* Neutral Events */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {neutralEvents.map(({ kind, icon, color, label }) => (
              <IonButton key={kind} color={color} onClick={() => openEventModal(kind)} style={{ flex: '1 1 180px', minWidth: 140 }}>
                <IonIcon icon={icon} slot="start" style={{ marginRight: 8 }} />
                {label}
              </IonButton>
            ))}
          </div>
          {/* Negative Events */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {negativeEvents.map(({ kind, icon, color, label }) => (
              <IonButton key={kind} color={color} onClick={() => openEventModal(kind)} style={{ flex: '1 1 180px', minWidth: 140 }}>
                <IonIcon icon={icon} slot="start" style={{ marginRight: 8 }} />
                {label}
              </IonButton>
            ))}
          </div>
        </div>

        {/* Team selector modal */}
        {showTeamSelect && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{ background: 'white', padding: 24, borderRadius: 8, minWidth: 250 }}>
              <h3>Select Team</h3>
              {teams.map(t => (
                <IonButton key={t.id} expand="block" onClick={() => handleTeamSelect(t.id)}>
                  {t.name}
                </IonButton>
              ))}
              <IonButton expand="block" color="medium" onClick={() => setShowTeamSelect(false)}>
                Cancel
              </IonButton>
            </div>
          </div>
        )}

        <IonToast
          isOpen={showToast}
          message="Event logged locally"
          duration={1500}
          onDidDismiss={() => setShowToast(false)}
        />

        {selectedTeamId && (
          <EventModal
            isOpen={showEventModal}
            onDidDismiss={() => { setShowEventModal(false); setSelectedTeamId(null); }}
            eventKind={selectedEventKind}
            team={selectedTeam}
            matchId={currentMatchId}
            seasonId={currentSeasonId}
            period={currentPeriod}
            defaultPlayerId="anon"
            onEventSaved={handleEventSaved}
          />
        )}

        {/* Events section at the bottom */}
        <div style={{
          marginTop: 32,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
            <div style={{
              fontWeight: 500,
              fontSize: 18,
              marginBottom: 8,
              textAlign: 'center',
              letterSpacing: 1
            }}>
              Match Events
            </div>
            <div 
              ref={eventsContainerRef}
              style={{
              width: '100%',
              maxWidth: 600,
              background: 'var(--ion-background-color, #fff)',
              borderRadius: 16,
              padding: 16,
              minHeight: 100,
              maxHeight: 320,
              overflowY: 'auto',
              boxShadow: '0 4px 16px 0 rgba(44,62,80,0.10), 0 1.5px 4px 0 rgba(44,62,80,0.08)',
              border: '1.5px solid var(--ion-color-light-shade, #e0e0e0)',
              transition: 'box-shadow 0.2s'
            }}>
              {eventLog.length === 0 && <div style={{ color: '#888', textAlign: 'center' }}>No events yet.</div>}
              {[...eventLog]
                .sort((a, b) => b.ts - a.ts)
                .map((ev, idx) => {
                  const btn = EVENT_BUTTONS.find(b => b.kind === ev.kind);
                  const teamObj = teams.find(t => t.id === ev.team);
                  const teamName = teamObj ? teamObj.name : ev.team;
                  const playerObj = teamObj?.players.find(p => p.id === ev.player);
                  const playerName = playerObj ? playerObj.full_name : ev.player;
                  return (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: 8,
                      padding: '6px 0',
                      borderBottom: idx !== eventLog.length - 1 ? '1px solid #f0f0f0' : 'none',
                      color: `var(--ion-color-${btn?.color ?? 'medium'})`,
                      background: idx % 2 === 0 ? 'rgba(0,0,0,0.01)' : 'transparent',
                    }}>
                      <IonIcon icon={btn?.icon} style={{ marginRight: 10, fontSize: 20 }} />
                      <span style={{ fontWeight: 500, minWidth: 90 }}>{btn?.label || ev.kind}</span>
                      <span style={{ marginLeft: 12, fontSize: 14, color: '#444', minWidth: 120 }}>
                        {teamName}
                      </span>
                      <span style={{ marginLeft: 12, fontSize: 14, color: '#666', minWidth: 100 }}>
                        {playerName}
                      </span>
                      <span style={{ marginLeft: 'auto', fontSize: 13, color: '#888', fontVariantNumeric: 'tabular-nums' }}>
                        {pad(Math.floor(ev.ts / 60000))}:{pad(Math.floor((ev.ts % 60000) / 1000))}
                      </span>
                    </div>
                  );
                })}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default MatchConsole;
