import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { RouteComponentProps } from 'react-router';
import { Block } from 'ts/component';
import { observer } from 'mobx-react';
import { dispatcher, I, Util} from 'ts/lib';

interface Props extends I.Block, RouteComponentProps<any> {
	onMouseMove? (e: any): void;
	onMouseLeave? (e: any): void;
	onResizeStart? (e: any, index: number): void;
};

@observer
class ListChildren extends React.Component<Props, {}> {
	
	refObj: any = {};
	
	render () {
		const { onMouseMove, onMouseLeave, onResizeStart, childBlocks, id, type, content } = this.props;
		const { style } = content;
		const length = childBlocks.length;
		
		if (!length) {
			return null;
		};
		
		let ColResize: any = (): any => null;
		let cn = [ 'children', 'c' + id ];
		
		if (type == I.BlockType.Layout) {
			if (style == I.LayoutStyle.Row) {
				ColResize = (item: any) => (
					<div className={[ 'colResize', 'c' + item.index ].join(' ')} onMouseDown={(e: any) => { onResizeStart(e, item.index); }}>
						<div className="inner">
							<div className="line" />
						</div>
					</div>
				);
			};
		};
		
		if ((type == I.BlockType.Text) && (style == I.TextStyle.Toggle)) {
			cn.push('canToggle');
		};
		
		return (
			<div className={cn.join(' ')} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
				{childBlocks.map((item: any, i: number) => {
					let css: any = {};
					let cn = [];
					
					if ((type == I.BlockType.Layout) && (style == I.LayoutStyle.Row)) {
						css.width = (item.fields.width || 1 / length ) * 100 + '%';
					};
					
					if (i == 0) {
						cn.push('first');
					};
					
					if (i == childBlocks.length - 1) {
						cn.push('last');
					};
					
					return (
						<React.Fragment key={item.id}>
							{(i > 0) && (style == I.LayoutStyle.Row) ? <ColResize index={i} /> : ''}
							<Block {...this.props} block={item} {...item} cnt={length} css={css} className={cn.join(' ')} index={i} />
						</React.Fragment>
					);
				})}
			</div>
		);
	};
	
};

export default ListChildren;