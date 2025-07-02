import React, { useState, useContext, useEffect } from 'react';
import {
  IonModal, IonContent, IonList, IonItem, IonLabel, IonChip,
  IonHeader, IonToolbar, IonButtons, IonButton, IonTextarea, IonIcon
} from '@ionic/react';
import { mic, micOff } from 'ionicons/icons';
import { MatchContext } from '../contexts/MatchContext';
import { db } from '../db/indexedDB';
import './GoalModal.css';

interface Player { id: string; full_name: string; }
interface Team   { id: string; name: string; players: Player[] }
type Step =
  | 'team'
  | 'goalType'    // for teams with NO player list
  | 'scorer'      // player list of scoring team
  | 'assist'      // player list of scoring team
  | 'oppScorer'   // player list of other team
  | 'oppAssist'   // player list of scoring team
  | 'notes';

interface Props {
  isOpen: boolean;
  onDidDismiss: () => void;
  matchId: string;
  period: number;
  ourTeam: Team;
  oppTeam: Team;
}

var ownGoalFlag = false; // global flag to track if the goal is an own goal

/* ———————————————————————————————————————————————— */

const GoalModal: React.FC<Props> = ({
  isOpen, onDidDismiss, matchId, period,
  ourTeam, oppTeam
}) => {
  /* context / clock */
  const { clock } = useContext(MatchContext);
  const elapsedMs =
    clock.running
      ? clock.offsetMs + Date.now() - (clock.startTs ?? 0)
      : clock.offsetMs;

  /* modal state */
  const [step, setStep]       = useState<Step>('team');
  const [team, setTeam]       = useState<Team | null>(null);
  const [scorer, setScorer]   = useState<Player | null | 'none'>(null);
  const [assist, setAssist]   = useState<Player | null | 'none'>(null);
  const [notes, setNotes]     = useState('');
  const [recognising, setRec] = useState(false);

  /* ——— reset state whenever modal closes ——— */
  useEffect(() => {
    if (!isOpen) {
      setStep('team'); setTeam(null); setScorer(null);
      setAssist(null); setNotes(''); setRec(false);
    }
  }, [isOpen]);

  /* ——— speech-to-text helper ——— */
  const dictation = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech recognition not supported'); return;
    }
    const rec = new (window as any).webkitSpeechRecognition();
    rec.lang = 'en-GB'; rec.onstart = () => setRec(true);
    rec.onresult = (e: any) => setNotes(n => n + ' ' + e.results[0][0].transcript);
    rec.onend = () => setRec(false); rec.start();
  };

  /* ——— final write ——— */
  const saveGoal = async (
    targetTeam: Team,
    scorerId: string | null,
    assistId: string | null,
    ownGoalFlag: boolean
  ) => {
    const kind = ownGoalFlag ? 'own_goal' : 'goal';
    await db.outbox.add({
      payload: {
        kind: kind,
        matchId,
        period,
        clockMs: elapsedMs,
        teamId: targetTeam.id,
        playerId: scorerId,
        assistPlayer: assistId,
        notes
      },
      synced: false,
      createdAt: Date.now()
    });
    console.log('Goal saved to IndexedDB');
    onDidDismiss();
    ownGoalFlag = false; // reset the global flag
  };

  /* ——— click handlers ——— */
  const chooseTeam = (t: Team) => {
    setTeam(t);
    if (t.players.length === 0) {
      setStep('goalType');          // Goal or Own Goal
    } else {
      setStep('scorer');            // regular player / own goal list
    }
  };

  const finish = () => {
    const assistId = assist ? (assist as Player).id : null;
    const scorerId = scorer ? (scorer as Player).id : null;
    if (ownGoalFlag) { 
        team!.id = team!.id === ourTeam.id ? oppTeam.id : ourTeam.id; // switch teams for own goal
    }
    saveGoal(team!, scorerId, assistId, ownGoalFlag);
  };

  /* ——— breadcrumb chips ——— */
  const Crumb = ({ label, go }: { label: string; go: () => void }) => (
    <IonChip onClick={go} color="light" style={{ marginRight: 4 }}>
      {label}
    </IonChip>
  );
  const CrumbGoal = team?.id === oppTeam.id ? 'Opp Goal' : 'Goal';
  const crumbBar = (
    <>
      <Crumb label={CrumbGoal} go={() => setStep('team')} />
      {scorer && <Crumb label={scorer === 'none'? 'Own Goal' : scorer.full_name} go={() => setStep('scorer')} />}
      {assist && assist !== 'none' && (
        <Crumb label={(assist as Player).full_name} go={() => setStep('assist')} />
      )}
    </>
  );

  /* ——— render lists ——— */
  /* GoalType list for empty-roster team ---------------------- */
    const renderGoalType = () => (
        <IonList>
        <IonItem button onClick={() => { /* normal goal */ setScorer(null); setAssist(null); setStep('notes'); }}>
            <IonLabel>Goal</IonLabel>
        </IonItem>
        <IonItem button onClick={() => { /* own goal */ setStep('oppScorer'); ownGoalFlag = true; }}>
            <IonLabel color="danger">Own Goal</IonLabel>
        </IonItem>
        </IonList>
    );
  
  const renderTeam = () => (
    <IonList>
      {[ourTeam, oppTeam].map(t => (
        <IonItem key={t.id} button onClick={() => chooseTeam(t)}>
          <IonLabel>{t.name}</IonLabel>
        </IonItem>
      ))}
    </IonList>
  );
  const renderScorer = () => {
    if (!team) return renderTeam();
    return (
        <IonList>
        {team!.players.map(p => (
            <IonItem key={p.id} button onClick={() => { setScorer(p); setStep('assist'); }}>
            <IonLabel>{p.full_name}</IonLabel>
            </IonItem>
        ))}
        <IonItem button onClick={() => {setStep('oppScorer'); ownGoalFlag = true; }}>
            <IonLabel color="danger">Own Goal</IonLabel>
        </IonItem>
        </IonList>
    );
  };
  const renderOppScorer = () => {
    if (!team) return renderTeam();
    const opp = team!.id === ourTeam.id ? oppTeam : ourTeam;
    return (
      <IonList>
        {opp.players.length === 0 && (
          <IonItem button onClick={() => { setScorer(null); setStep('oppAssist'); }}>
            <IonLabel>Unknown Player</IonLabel>
          </IonItem>
        )}
        {opp.players.map(p => (
          <IonItem key={p.id} button onClick={() => { setScorer(p); setStep('oppAssist'); }}>
            <IonLabel>{p.full_name}</IonLabel>
          </IonItem>
        ))}
      </IonList>
    );
  };
  const renderAssist = () => {
    if (!team) return renderTeam();
        return (
        <IonList>
        <IonItem button onClick={() => { setAssist('none'); setStep('notes'); }}>
            <IonLabel>No Assister</IonLabel>
        </IonItem>
        {team!.players.map(p => (
            <IonItem key={p.id} button onClick={() => { setAssist(p); setStep('notes'); }}>
            <IonLabel>{p.full_name}</IonLabel>
            </IonItem>
        ))}
        </IonList>
    );
  };
  const renderOppAssist = renderAssist;
  const renderNotes = () => (
    <>
      <IonItem lines="none">
        <IonLabel position="stacked">Notes (optional)</IonLabel>
        <IonTextarea
          value={notes}
          onIonInput={e => setNotes(e.detail.value!)}
          rows={3}
        />
        <IonButton slot="end" fill="clear" onClick={dictation}>
          <IonIcon slot="icon-only" icon={recognising ? micOff : mic} />
        </IonButton>
      </IonItem>
      <IonButton expand="block" color="success" onClick={finish}>
        Save
      </IonButton>
    </>
  );

  /* ——— main render ——— */
  const body = {
    team:      renderTeam(),
    goalType:  renderGoalType(),
    scorer:    renderScorer(),
    assist:    renderAssist(),
    oppScorer: renderOppScorer(),
    oppAssist: renderOppAssist(),
    notes:     renderNotes()
  }[step];

  const safeBody =
  (!team && step !== 'team') ? renderTeam() : body;

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDidDismiss} animated canDismiss={true}>
      <IonHeader translucent>
        <IonToolbar>
          <IonButtons slot="start">
            {crumbBar}
          </IonButtons>
          <IonButtons slot="end">
            <IonButton onClick={onDidDismiss}>Close</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className={`fade-${step}`} fullscreen>
        {safeBody}
      </IonContent>
    </IonModal>
  );
};

export default GoalModal;
