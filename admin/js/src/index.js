import { createRoot } from 'react-dom/client';
import AdminApp from './components/AdminApp';

const container = document.getElementById( 'guidwell-admin' );
if ( container ) {
	createRoot( container ).render( <AdminApp /> );
}
