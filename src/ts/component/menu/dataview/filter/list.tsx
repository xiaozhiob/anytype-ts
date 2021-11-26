import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { SortableContainer, SortableElement, SortableHandle } from 'react-sortable-hoc';
import { Icon, IconObject, Tag } from 'ts/component';
import { detailStore, dbStore, menuStore, blockStore } from 'ts/store';
import { I, C, DataUtil } from 'ts/lib';
import arrayMove from 'array-move';
import { translate, Util, keyboard } from 'ts/lib';
import { observer } from 'mobx-react';

interface Props extends I.Menu {}

const Constant = require('json/constant.json');
const $ = require('jquery');

const MenuFilterList = observer(class MenuFilterList extends React.Component<Props, {}> {
	
	n: number = 0;

	constructor (props: any) {
		super(props);
		
		this.save = this.save.bind(this);
		this.onAdd = this.onAdd.bind(this);
		this.onRemove = this.onRemove.bind(this);
		this.onSortEnd = this.onSortEnd.bind(this);
	};
	
	render () {
		const { param } = this.props;
		const { data } = param;
		const { rootId, blockId, getView } = data;
		const view = getView();
		const allowedView = blockStore.isAllowed(rootId, blockId, [ I.RestrictionDataview.View ]);
		const subId = dbStore.getSubId(rootId, blockId);

		if (!view) {
			return null;
		};

		const filterCnt = view.filters.length;
		const items = this.getItems();

		for (let filter of items) {
			const { relationKey, condition, value } = filter;
		};

		const Handle = SortableHandle(() => (
			<Icon className="dnd" />
		));
		
		const Item = SortableElement((item: any) => {
			const relation = item.relation;
			const conditionOptions = DataUtil.filterConditionsByType(relation.format);
			const condition: any = conditionOptions.find((it: any) => { return it.id == item.condition; }) || {};

			let value = null;
			let list = [];
			let Item = null;

			switch (relation.format) {

				default:
					value = `“${item.value}”`
					break;

				case I.RelationType.Number:
					value = Number(item.value) || 0;
					break;

				case I.RelationType.Date:
					value = item.value !== null ? Util.date('d.m.Y', item.value) : 'empty';
					break;

				case I.RelationType.Checkbox:
					value = item.value ? 'checked' : 'unchecked';
					break;

				case I.RelationType.Tag:
				case I.RelationType.Status:
					list = (item.value || []).map((id: string, i: number) => { 
						return (relation.selectDict || []).find((it: any) => { return it.id == id; });
					});
					list = list.filter((it: any) => { return it && it.id; });

					if (list.length) {
						value = (
							<React.Fragment>
								{list.map((item: any, i: number) => {
									return <Tag {...item} key={item.id} className={DataUtil.tagClass(relation.format)} />;
								})}
							</React.Fragment>
						);
					} else {
						value = 'empty';
					};
					break;

				case I.RelationType.Object:
					Item = (item: any) => {
						return (
							<div className="element">
								<div className="flex">
									<IconObject object={item} />
									<div className="name">{item.name}</div>
								</div>
							</div>
						);
					};

					list = DataUtil.getRelationArrayValue(item.value).map((it: string) => { return detailStore.get(subId, it, []); });
					list = list.filter((it: any) => { return !it._empty_; });

					value = (
						<React.Fragment>
							{list.map((item: any, i: number) => {
								return <Item key={i} {...item} />;
							})}
						</React.Fragment>
					);
					break;
			};

			if ([ I.FilterCondition.None, I.FilterCondition.Empty, I.FilterCondition.NotEmpty ].indexOf(item.condition) >= 0) {
				value = null;
			};

			return (
				<form id={'item-' + item.id} className={[ 'item', (!allowedView ? 'isReadonly' : '') ].join(' ')} onMouseEnter={(e: any) => { this.onOver(e, item); }}>
					{allowedView ? <Handle /> : ''}
					<IconObject size={40} object={{ relationFormat: relation.format, layout: I.ObjectLayout.Relation }} />

					<div className="txt" onClick={(e: any) => { this.onClick(e, item); }}>
						<div className="name">{relation.name}</div>
						<div className="flex">
							<div className="condition grey">
								{condition.name}
							</div>
							{value !== null ? (
								<div className="value grey">
									{value}
								</div>
							) : ''}
						</div>
					</div>

					{allowedView ? (
						<div className="buttons">
							<Icon className="more" onClick={(e: any) => { this.onClick(e, item); }} />
							<Icon className="delete" onClick={(e: any) => { this.onRemove(e, item); }} />
						</div>
					) : ''}
				</form>
			);
		});
		
		const ItemAdd = SortableElement((item: any) => (
			<div className="item add" onClick={this.onAdd}>
				<Icon className="plus" />
				<div className="name">Add a filter</div>
			</div>
		));
		
		const List = SortableContainer((item: any) => {
			return (
				<div className="items">
					<div className="scrollWrap">
						{items.map((item: any, i: number) => (
							<Item key={i} {...item} id={i} index={i} />
						))}
						{!items.length ? (
							<div className="item empty">
								<div className="inner">No filters applied to this view</div>
							</div>
						) : ''}
					</div>
					{allowedView ? (
						<div className="bottom">
							<div className="line" />
							<ItemAdd index={items.length + 1} disabled={true} /> 
						</div>
					) : ''}
				</div>
			);
		});
		
		return (
			<List 
				axis="y" 
				lockAxis="y"
				lockToContainerEdges={true}
				transitionDuration={150}
				distance={10}
				onSortEnd={this.onSortEnd}
				useDragHandle={true}
				helperClass="isDragging"
				helperContainer={() => { return $(ReactDOM.findDOMNode(this)).get(0); }}
			/>
		);
	};
	
	componentDidMount () {
		this.rebind();
	};

	componentDidUpdate () {
		this.props.setActive();
	};

	componentWillUnmount () {
		this.unbind();
		menuStore.closeAll(Constant.menuIds.cell);
	};

	rebind () {
		const { getId } = this.props;
		const obj = $(`#${getId()} .content`);

		obj.unbind('click').on('click', () => { menuStore.closeAll(Constant.menuIds.cell); });

		this.unbind();
		$(window).on('keydown.menu', (e: any) => { this.props.onKeyDown(e); });
		window.setTimeout(() => { this.props.setActive(); }, 15);
	};
	
	unbind () {
		$(window).unbind('keydown.menu');
	};

	onAdd (e: any) {
		const { param, getId } = this.props;
		const { data } = param;
		const { getView } = data;
		const view = getView();
		const relationOptions = this.getRelationOptions();

		if (!relationOptions.length) {
			return;
		};

		const obj = $(`#${getId()} .content`);
		const first = relationOptions[0];
		const conditions = DataUtil.filterConditionsByType(first.format);
		const condition = conditions.length ? conditions[0].id : I.FilterCondition.None;

		view.filters.push({ 
			relationKey: first.id, 
			operator: I.FilterOperator.And, 
			condition: condition as I.FilterCondition,
			value: DataUtil.formatRelationValue(first, null, false),
		});

		obj.animate({ scrollTop: obj.get(0).scrollHeight }, 50);
		this.save();
	};

	onRemove (e: any, item: any) {
		const { param } = this.props;
		const { data } = param;
		const { getView } = data;
		const view = getView();

		view.filters = view.filters.filter((it: any, i: number) => { return i != item.id; });
		this.save();

		menuStore.close('select');
	};

	onOver (e: any, item: any) {
		if (!keyboard.isMouseDisabled) {
			this.props.setActive(item, false);
		};
	};

	onClick (e: any, item: any) {
		const { param, getId } = this.props;
		const { data } = param;

		menuStore.open('dataviewFilterValues', {
			element: `#${getId()} #item-${item.id}`,
			horizontal: I.MenuDirection.Center,
			noFlipY: true,
			data: {
				...data,
				save: this.save,
				itemId: item.id,
			}
		});
	};
	
	onSortEnd (result: any) {
		const { param } = this.props;
		const { data } = param;
		const { getView } = data;
		const view = getView();
		const { oldIndex, newIndex } = result;

		view.filters = arrayMove(view.filters, oldIndex, newIndex);
		this.save();
	};

	save () {
		const { param } = this.props;
		const { data } = param;
		const { getView, getData, rootId, blockId, onSave } = data;
		const view = getView();

		C.BlockDataviewViewUpdate(rootId, blockId, view.id, view, (message: any) => {
			if (onSave) {
				onSave(message);
			};
			window.setTimeout(() => { this.forceUpdate(); }, 50);

			getData(view.id, 0);
		});
	};

	getItems () {
		const { param } = this.props;
		const { data } = param;
		const { rootId, blockId, getView } = data;
		const view = getView();

		if (!view) {
			return [];
		};

		let n = 0;
		return Util.objectCopy(view.filters || []).map((it: any) => {
			return { 
				...it, 
				id: n++,
				relation: dbStore.getRelation(rootId, blockId, it.relationKey),
			};
		}).filter((it: any) => { return it.relation; });
	};

	getRelationOptions () {
		const { param } = this.props;
		const { data } = param;
		const { rootId, blockId, getView } = data;

		return DataUtil.getRelationOptions(rootId, blockId, getView());
	};

});

export default MenuFilterList;