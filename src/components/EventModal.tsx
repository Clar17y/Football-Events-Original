import React, { useState, useContext } from 'react';
import {
  IonModal, IonContent, IonList, IonItem, IonLabel, IonSelect, IonSelectOption,
  IonHeader, IonToolbar, IonButtons, IonButton, IonTextarea, IonTitle, IonIcon
} from '@ionic/react';
import { mic, micOff } from 'ionicons/icons';
import { MatchContext } from '../contexts/MatchContext';
import { db } from '../db/indexedDB';
import { useSpeechToText } from '../utils/useSpeechToText';

const SENTIMENTS = [
  { value: 4,  label: 'Outstanding' },
  { value: 3,  label: 'Excellent' },
  { value: 2,  label: 'Good' },
  { value: 1,  label: 'Solid' },
  { value: 0,  label: 'Neutral' },
  { value: -1, label: 'Below par' },
  { value: -2, label: 'Poor' },
  { value: -3, label: 'Bad' },
  { value: -4, label: 'Terrible' },
];

interface Player { id: string; full_name: string; }
interface Team   { id: string; name: string; players: Player[] }

interface EventModalProps {
  isOpen: boolean;
  onDidDismiss: () => void;
  eventKind: string;
  team: Team;
  matchId: string;
  seasonId: string;
  period: number;
  defaultPlayerId?: string;
  onEventSaved?: (event: { kind: string; team: string; player: string; ts: number}) => void;
}

const EventModal: React.FC<EventModalProps> = ({
  isOpen, onDidDismiss, eventKind, team, matchId, seasonId, period, defaultPlayerId, onEventSaved
}) => {
  const { clock } = useContext(MatchContext);
  const elapsedMs = clock.running
    ? clock.offsetMs + Date.now() - (clock.startTs ?? 0)
    : clock.offsetMs;

  const [playerId, setPlayerId] = useState<string>(defaultPlayerId || '');
  const [sentiment, setSentiment] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const { recognising, startDictation } = useSpeechToText(
    (text) => setNotes(n => n + ' ' + text));

  const saveEvent = async () => {
    if (!playerId) return;
    const event = {
        kind: eventKind,
        team: team.id,
        player: playerId,
        ts: elapsedMs,
    };
    await db.outbox.add({
      payload: {
        kind: eventKind,
        match_id: matchId,
        season_id: seasonId,
        created: Date.now(),
        period_number: period,
        clock_ms: elapsedMs,
        team_id: team.id,
        player_id: playerId,
        sentiment,
        notes,
      },
      synced: false,
      createdAt: Date.now()
    });
    if (onEventSaved) onEventSaved(event);
    onDidDismiss();
    setPlayerId('');
    setSentiment(0);
    setNotes('');
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDidDismiss}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{eventKind.replace('_', ' ').toUpperCase()}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onDidDismiss}>Close</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonList>
          <IonItem>
            <IonLabel position="stacked">Player</IonLabel>
            <IonSelect
                interface="popover"
                value={playerId}
                placeholder="Select player"
                onIonChange={e => setPlayerId(e.detail.value)}
                >
                {team.players.map(p => (
                    <IonSelectOption key={p.id} value={p.id}>{p.full_name}</IonSelectOption>
                ))}
            </IonSelect>
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Sentiment</IonLabel>
            <IonSelect
                interface="popover"
                value={sentiment}
                placeholder="Select sentiment"
                onIonChange={e => setSentiment(Number(e.detail.value))}
                >
              {SENTIMENTS.map(s => (
                <IonSelectOption key={s.value} value={s.value}>{s.label}</IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>
          <IonItem lines="none">
            <IonLabel position="stacked">Notes (optional)</IonLabel>
            <IonTextarea
              value={notes}
              onIonInput={e => setNotes(e.detail.value!)}
              rows={3}
            />
            <IonButton slot="end" fill="clear" onClick={startDictation}>
            <IonIcon slot="icon-only" icon={recognising ? micOff : mic} />
            </IonButton>
          </IonItem>
        </IonList>
        <IonButton expand="block" color="success" onClick={saveEvent} disabled={!playerId}>
          Save
        </IonButton>
      </IonContent>
    </IonModal>
  );
};

export default EventModal;