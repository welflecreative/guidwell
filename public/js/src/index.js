import { createRoot } from 'react-dom/client';
import Wizard from './components/Wizard';

const mountPoint = document.getElementById( 'guidwell' );

if ( mountPoint ) {
	const root = createRoot( mountPoint );
	root.render( <Wizard /> );
}
