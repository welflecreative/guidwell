/**
 * Returns full feature objects that are both in plan.features and in featuresList.
 * Filters out any IDs that no longer exist in the master list.
 *
 * @param {Object} plan         Plan object — may have a .features array of IDs.
 * @param {Array}  featuresList Master list of { id, label } objects.
 * @returns {Array<{ id: string, label: string }>}
 */
export function getActivePlanFeatures( plan, featuresList ) {
	const ids = Array.isArray( plan?.features ) ? plan.features : [];
	if ( ! ids.length || ! Array.isArray( featuresList ) || ! featuresList.length ) return [];
	const map = new Map( featuresList.map( ( f ) => [ f.id, f ] ) );
	return ids.map( ( id ) => map.get( id ) ).filter( Boolean );
}
