// SI-generated: written by Claude Code (Anthropic) for the SunSight team. See SI_USE.md.
import { render } from 'preact';
import { App } from './App';
import { HorizonApp } from './horizon/HorizonApp';
import { isHorizonQuery } from './horizon/useHorizonState';
import './styles.css';

// Review note 009: the horizon interface is shown only with ?ui=horizon; the classic App stays the default.
const horizon = typeof location !== 'undefined' && isHorizonQuery(location.search);
render(horizon ? <HorizonApp /> : <App />, document.getElementById('app')!);
