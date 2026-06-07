import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import { PanelBody, SelectControl, Placeholder, Spinner } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

import metadata from '../../block.json';

registerBlockType( metadata.name, {
	edit: Edit,
	save: () => null, // dynamic block — PHP renders the front end
} );

function Edit( { attributes, setAttributes } ) {
	const { wizardId } = attributes;
	const blockProps = useBlockProps( { className: 'guidwell-block-editor' } );

	const { wizards, isLoading } = useSelect( ( select ) => {
		const { getEntityRecords, isResolving } = select( 'core' );
		const query = { per_page: 100, status: 'publish', orderby: 'date', order: 'asc' };
		return {
			wizards:   getEntityRecords( 'postType', 'guidwell_wizard', query ),
			isLoading: isResolving( 'getEntityRecords', [ 'postType', 'guidwell_wizard', query ] ),
		};
	}, [] );

	const options = [
		{ label: __( '— Auto (first published wizard) —', 'guidwell' ), value: 0 },
		...( wizards || [] ).map( ( w ) => ( { label: w.title?.rendered || `Wizard #${ w.id }`, value: w.id } ) ),
	];

	const selectedLabel = wizardId > 0
		? ( wizards || [] ).find( ( w ) => w.id === wizardId )?.title?.rendered || `Wizard #${ wizardId }`
		: __( 'Auto (first published wizard)', 'guidwell' );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Wizard', 'guidwell' ) }>
					{ isLoading ? (
						<Spinner />
					) : (
						<SelectControl
							label={ __( 'Select wizard', 'guidwell' ) }
							value={ wizardId }
							options={ options }
							onChange={ ( val ) => setAttributes( { wizardId: Number( val ) } ) }
						/>
					) }
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<Placeholder
					icon="forms"
					label={ __( 'Guidwell Wizard', 'guidwell' ) }
					instructions={ isLoading
						? __( 'Loading wizards…', 'guidwell' )
						: __( 'This block will display the recommendation wizard on the front end.', 'guidwell' )
					}
				>
					{ isLoading ? (
						<Spinner />
					) : (
						<p className="guidwell-block-editor__selected">
							{ __( 'Selected:', 'guidwell' ) } <strong>{ selectedLabel }</strong>
						</p>
					) }
				</Placeholder>
			</div>
		</>
	);
}
