import { render } from 'preact';
import '@fontsource-variable/google-sans-flex/rond.css';
import '../styles.css';
import { Embed } from './embed';

render(<Embed />, document.getElementById('app')!);
