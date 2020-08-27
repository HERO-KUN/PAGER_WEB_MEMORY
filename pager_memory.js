/* pager_memory.js by KouHiro kun */

/** @class
 *  @classdesc Pager class which returns completed pager object. */
class Pager{
  /**
   * @constructor
   * @param {HTMLElement} pagerElement
   * @param {PagerOptions} options
   */
  constructor(pagerElement, options) {
    let pager = this;

    /** @type {HTMLElement}
     *  @description pager element */
    this.object = pagerElement;

    /** @type {HTMLDivElement[]}
     *  @description page items */
    this.items = [];

    /** @type {number}
     *  @description raw page count includes overscroll dummy pages. */
    this.pageCount = 0;

    /** @type {number}
     *  @description count of valid pages. */
    this.validPageCount = 0;

    /** @type {number}
     *  @description current selected item position. includes overscroll dummy pages. */
    this.selected = 0;

    /** @type {PagerOptions}
     *  @description count of valid pages. */
    this.options = options;

    /** @type {number[]}
     *  @description size of pager. refreshes when window.resize */
    this.size = this.getSize(this.object);

    /** @type {function(position: number)[]}
     *  @description list of page changed listeners. */
    this.pageListener = [];

    /** @type {function(value: number)[]}
     *  @description list of scroll changed listeners. */
    this.scrollListener = [];

    /** @type {function(count: number)[]}
     *  @description list of page set changed listeners. called when addPage() or removePage(). */
    this.pageSetChangedListener = [];

    /** @type {((function(number))[])[]}
     *  @description holds all type of listeners. */
    this.listeners = [this.pageListener, this.pageSetChangedListener, this.scrollListener];

    /** @type {PageTransitionMethod}
     *  @description page transition method which defines page position, transition, etc. */
    this.pageTransitionMethod = undefined;

    /** @type {boolean}
     *  @description set this true to lock pager, false otherwise. */
    this.lockPager = false;

    /** @type {Object}
     *  @description flags object related with this pager. */
    this.flags = {
      beforeSelected: 0,
      animating: false,
      pointerDown: false,
      value: 0,
      pointerEventStartPos: [0, 0],
      verticalScrolling: false,
      horizontalScrolling: false,
      scrollFixed: false
    };

    pager.setUp();
    pager.notifyPagerResized();
    window.addEventListener('resize', function () {
      pager.notifyPagerResized();
    });
    window.addEventListener('load', function () {
      pager.notifyPagerResized();
    });
    pager.setPageTransitionMethod(new DefaultPageTransitionMethod());
    pager.selectPage(0, false);
  }

  /** @public
   *  @return {void}
   *  @param {number} target target position of page.
   *  @param {boolean} animate true if want to animate page transition, false otherwise.
   *  @description selects page with given target position. */
  selectPage(target, animate){
    if(this.lockPager) return;
    if(target < 0) return;

    if(target > this.validPageCount - 1) return;
    let position = this.mapPageIndex(target);
    if(animate) this.animatePage(position);
    else this.setPage(position);
  }

  /** @public
   *  @return {void}
   *  @param {boolean} animate true if want to animate page transition, false otherwise.
   *  @description selects next page of current selected page. */
  selectNext(animate){
    this.selectPage(this.getSelectedPageIndex() + 1, animate);
  }

  /** @public
   *  @return {void}
   *  @param {boolean} animate true if want to animate page transition, false otherwise.
   *  @description selects previous page of current selected page. */
  selectPrev(animate){
    this.selectPage(this.getSelectedPageIndex() - 1, animate);
  }

  /** @public
   *  @return {number}
   *  @description returns current selected page. excludes dummy page. */
  getSelectedPageIndex(){
    return ((this.options.useOverscroll) ? this.selected - 1 : this.selected);
  }

  /** @public
   *  @return {void}
   *  @param {number} position target position to insert in.
   *  @param {HTMLDivElement} element target page to insert.
   *  @description adds div element into pager with given position. */
  addPage(position, element){
    let pager = this;
    if(position < 0) return;
    if(position > pager.validPageCount - 1) {
      if(!pager.options.useOverscroll){
        pager.object.appendChild(element);
      }else{
        pager.object.insertBefore(element, pager.object.lastChild);
      }
    }else{
      pager.object.insertBefore(element, pager.items[pager.mapPageIndex(position)]);
    }
    pager.notifyPageUpdated();
    pager.repositionPage();

    if(position > pager.getSelectedPageIndex())
      pager.setPage(pager.selected);
    else
      pager.setPage(pager.selected + 1);
  }

  /** @public
   *  @return {void}
   *  @param {number} position target position to remove.
   *  @description remove page from pager with given position. */
  removePage(position){
    let pager = this;
    if(pager.validPageCount === 1) {
      console.error("ERROR : pager must have at least 1 page. you are trying to remove last one page.");
      return;
    }
    if(position < 0) return;
    if(position > pager.validPageCount - 1) return;

    pager.items[this.mapPageIndex(position)].remove();
    this.notifyPageUpdated();
    this.repositionPage();

    if(position >= pager.getSelectedPageIndex())
      this.setPage(pager.selected);
    else
      this.setPage(pager.selected - 1);
  }

  /** @public
   *  @return {null|string}
   *  @param {number} position target position of page.
   *  @description returns page title which is declared in html with data-pagermemory-title attribute. */
  getPageTitle(position) {
    let pager = this;
    if(position > pager.validPageCount || position < 0) return null;
    return pager.items[this.mapPageIndex(position)].dataset.pagermemoryTitle;
  }

  /** @public
   *  @return {void}
   *  @param {number} type one of Pager.LISTENER_TYPE_PAGE, Pager.LISTENER_TYPE_PAGE_SET, Pager.LISTENER_TYPE_SCROLL.
   *  @param {function(i: number)} listener listener function.
   *  @description adds listener with given type. */
  addListener(type, listener){
    this.listeners[type].push(listener);
  }

  /** @public
   *  @return {void}
   *  @param {number} type one of Pager.LISTENER_TYPE_PAGE, Pager.LISTENER_TYPE_PAGE_SET, Pager.LISTENER_TYPE_SCROLL.
   *  @param {function(i: number)} listener listener function.
   *  @description removes listener with given type. */
  removeListener(type, listener){
    this.listeners[type].splice(this.listeners[type].indexOf(listener), 1);
  }

  /** @public
   *  @return {void}
   *  @param {number} type one of Pager.LISTENER_TYPE_PAGE, Pager.LISTENER_TYPE_PAGE_SET, Pager.LISTENER_TYPE_SCROLL.
   *  @description removes all listeners with given type. */
  removeAllListener(type){
    this.listeners[type] = [];
  }

  /** @public
   *  @return {void}
   *  @param {PageTransitionMethod} method
   *  @description sets page transition method to pager. default is DefaultPageTransitionMethod. */
  setPageTransitionMethod(method){
    this.pageTransitionMethod = method;
    this.pageTransitionMethod.parent = this;
    this.notifyPageTransitionMethodUpdated(this);
  }

  /** @private
   *  @return {void}
   *  @description Internal call only. Setup the pager. */
  setUp(){
    let pager = this;
    pager.object.style.overflow = 'hidden';
    if(pager.options.useOverscroll){
      pager.object.insertBefore(document.createElement('div'), pager.object.childNodes[0]);
      pager.object.appendChild(document.createElement('div'));
    }
    this.notifyPageUpdated();

    if(pager.options.usePointerEvent){

      let pointerDown = function(x, y) {
        if(pager.flags.animating) return;
        pager.flags.pointerDown = true;
        pager.flags.pointerEventStartPos = [x, y];
      };

      let pointerMove = function(x, y) {
        if(pager.flags.animating) return;
        if(!pager.flags.pointerDown) return;
        if(!pager.flags.scrollFixed){
          pager.flags.verticalScrolling = Math.abs(x - pager.flags.pointerEventStartPos[0]) < Math.abs(y - pager.flags.pointerEventStartPos[1]);
          pager.flags.horizontalScrolling = !pager.flags.verticalScrolling;
          pager.flags.scrollFixed = (Math.abs(x - pager.flags.pointerEventStartPos[0]) > 10 || Math.abs(y - pager.flags.pointerEventStartPos[1]) > 10);
        }
        let positionIndex = (pager.options.type === 'vertical') ? 1 : 0;
        let value = pager.selected + (1/pager.size[positionIndex]*(pager.flags.pointerEventStartPos[positionIndex] - ((pager.options.type === 'vertical') ? y : x)));
        pager.scrollPage(value);
      }

      let pointerUp = function(){
        if(pager.flags.animating) return;

        let MAX_PAGE_INDEX = pager.mapPageIndex(pager.validPageCount - 1);
        let MIN_PAGE_INDEX = pager.mapPageIndex(0);
        let AMOUNT = pager.selected - pager.flags.value;
        if(AMOUNT > 0.1 && pager.selected !== MIN_PAGE_INDEX){
          pager.animatePage(pager.selected - 1);
        }else if(AMOUNT < -0.1 && pager.selected !== MAX_PAGE_INDEX){
          pager.animatePage(pager.selected + 1);
        }else{
          pager.animatePage(pager.selected);
        }
        pager.flags.pointerDown = false;
        pager.flags.pointerEventStartPos = [0, 0];
        pager.flags.verticalScrolling = false;
        pager.flags.horizontalScrolling = false;
        pager.flags.scrollFixed = false;
      }

      pager.object.addEventListener('mousedown', function(event) { pointerDown(event.pageX, event.pageY) });
      pager.object.addEventListener('mousemove', function(event) { pointerMove(event.pageX, event.pageY); });
      window.addEventListener('mouseup', function() { pointerUp() });

      pager.object.addEventListener('touchstart', function(event) { pointerDown(event.touches[0].clientX, event.touches[0].clientY); });
      pager.object.addEventListener('touchmove', function(event) { pointerMove(event.touches[0].clientX, event.touches[0].clientY); });
      window.addEventListener('touchend', function() { pointerUp(); });

    }
  }

  /** @private
   *  @return {void}
   *  @description Internal call only. repositions pages after page set changed. */
  repositionPage() {
    let pager = this;
    for(let i = 0; i < pager.items.length; i++){
      if(pager.options.type === 'vertical'){
        pager.items[i].style.top = 'calc(' + (-100 * i) + '% + ' + pager.pageTransitionMethod.position(i) + ')';
      }else{
        pager.items[i].style.left = pager.pageTransitionMethod.position(i);
      }
    }
  }

  /** @private
   *  @return {void}
   *  @description Internal call only. Re-positions pages and update items and pageCount. */
  notifyPageUpdated(){
    let pager = this;
    let children = pager.object.childNodes;
    let childIndex = 0;
    pager.items = [];
    for (let i = 0; i < children.length; i++) {
      if(children[i].nodeType !== 1) children[i].remove();
    }
    for (let i = 0; i < children.length; i++) {
      if(children[i].nodeType !== 1) continue;
      let each = children[i];
      each.style.overflowY = (pager.options.useOverscroll && (i === 0 || i === children.length - 1)) ? 'hidden' : 'auto';
      each.style.position = 'relative';
      each.style.width = '100%';
      each.style.height = '100%';
      each.style.padding = '0';
      each.style.margin = '0';
      if(pager.options.type === 'vertical'){
        each.style.left = (childIndex * -100) + '%';
      }else{
        each.style.top = (childIndex * -100) + '%';
      }
      pager.items.push(each);
      childIndex++;
    }
    pager.pageCount = childIndex;
    pager.validPageCount = childIndex - (pager.options.useOverscroll ? 2 : 0);
    for(let i = 0; i < pager.items.length; i++){
      pager.items[i].style.zIndex = (pager.items.length - i).toString();
    }
    for(let i = 0; i < pager.pageSetChangedListener.length; i++){
      pager.pageSetChangedListener[i](pager.validPageCount);
    }
  }

  /** @private
   *  @return {void}
   *  @param {Pager} pager pager object to reposition pages
   *  @description Internal call only. Re-positions pages according to current page transition method. */
  notifyPageTransitionMethodUpdated(pager){
    this.repositionPage();
    pager.selectPage(pager.getSelectedPageIndex(), false);
  }

  /** @private
   *  @return {void}
   *  @description Internal call only. Reset the pager.size property and select the selected item again. */
  notifyPagerResized(){
    let pager = this;
    pager.size = this.getSize(pager.object);
    if(pager.pageTransitionMethod !== undefined)
      pager.selectPage(pager.getSelectedPageIndex(), false);
  }

  /** @private
   *  @return {void}
   *  @param {number} pageIndex target page index
   *  @description Internal call only. Sets pager page without any animations. */
  setPage(pageIndex){
    let pager = this;
    if(pager.lockPager) return;
    this.scrollPage(pageIndex);
    pager.selected = pageIndex;
    this.performPageListener();
  }

  /** @private
   *  @return {void}
   *  @param {number} pageIndex target page index
   *  @description Internal call only. Sets pager page with animation. */
  animatePage(pageIndex){
    let pager = this;
    const PAGERMEMORY_PAGE_ANIMATE_DURATION = 320;

    if(pager.lockPager) return;
    if(pager.flags.animating) return;
    pager.flags.animating = true;
    pager.animateValue(pager.flags.value, pageIndex, PAGERMEMORY_PAGE_ANIMATE_DURATION,
        function(animatedValue){
          pager.scrollPage(animatedValue);
        },
        function(){
          pager.flags.animating = false;
        }
    );
    pager.selected = pageIndex;
    pager.performPageListener();
  }

  /** @private
   *  @return {void}
   *  @param {number} value target scroll value
   *  @description Internal call only. Scrolls pager to target value. target value can be 0 ~ pager.pageCount - 1. float values available.*/
  scrollPage(value){
    let pager = this;
    if(pager.lockPager) return;
    if(value > pager.pageCount - 1 || value < 0) return;
    if(pager.options.type !== 'vertical' && pager.flags.verticalScrolling) return;
    if(pager.options.type === 'vertical' && pager.flags.horizontalScrolling) return;
    if(pager.options.type === 'vertical'){
      pager.object.scrollTop = pager.pageTransitionMethod.scrollPage(value);
    }else{
      pager.object.scrollLeft = pager.pageTransitionMethod.scrollPage(value);
    }
    for(let pageIndex = 0; pageIndex < pager.pageCount; pageIndex++){
      let translateType = (pager.options.type === 'vertical') ? 'Y' : 'X';
      pager.items[pageIndex].style.transform =
          'translate' + translateType + '(' + pager.pageTransitionMethod.translatePage(value, pageIndex) + ') ' +
          'scale(' + pager.pageTransitionMethod.scalePage(value, pageIndex) + ')';
      pager.items[pageIndex].style.opacity = pager.pageTransitionMethod.opacityPage(value, pageIndex).toString();
    }
    for(let i = 0; i < pager.scrollListener.length; i++){
      pager.scrollListener[i](pager.options.useOverscroll ? value-1 : value);
    }
    pager.flags.value = value;
  }

  /** @private
   *  @return {void}
   *  @description Internal call only. Performs Page Listener. */
  performPageListener(){
    let pager = this;
    if(pager.selected !== pager.flags.beforeSelected){
      for(let i = 0; i < pager.pageListener.length; i++){
        pager.pageListener[i](pager.getSelectedPageIndex());
      }
      pager.flags.beforeSelected = pager.selected;
    }
    for(let i = 0; i < pager.items.length; i++){
      if(i === pager.selected) pager.items[i].style.pointerEvents = 'all';
      else pager.items[i].style.pointerEvents = 'none';
    }
  }

  /** @private
   *  @return {void}
   *  @param {number} from start value
   *  @param {number} to end value
   *  @param {number} duration animate duration
   *  @param {function(i: number)} step function that called every frame
   *  @param {function()} finish function that called when animate finished
   *  @description Internal call only. Animates value linearly. */
  animateValue(from, to, duration, step, finish){
    if(from === to)  { finish(); return; }
    let progress = 0;
    let animatedValue = from;
    let DELTA = Math.abs(to - from);
    let DIRECTION = (to - from > 0) ? 1 : -1;
    let STEP_LENGTH_MS = 10;
    let STEP_LENGTH = DELTA/(duration/STEP_LENGTH_MS);
    let animate = function(){
      if(duration <= progress * STEP_LENGTH_MS) {
        step(to);
        finish();
        return;
      }
      animatedValue = from + DIRECTION * STEP_LENGTH * progress;
      step(animatedValue);
      progress++;
      setTimeout(animate, STEP_LENGTH_MS);
    }
    animate();
  }

  /** @private
   *  @return {number}
   *  @param {number} position position of pager which will be mapped
   *  @description Internal call only. Returns mapped page index related with pager.options.useOverscroll */
  mapPageIndex(position){
    let pager = this;
    return position + (pager.options.useOverscroll ? 1 : 0);
  }

  /** @private
   *  @return {number[]}
   *  @param {HTMLElement} element target element
   *  @description Internal call only. Returns size of element. */
  getSize(element){
    let rect = element.getBoundingClientRect();
    if(rect.width !== 0 && rect.height !== 0){
      return [rect.width, rect.height];
    } else {
      return [rect.right - rect.left, rect.bottom - rect.top];
    }
  }

  static LISTENER_TYPE_PAGE = 0;
  static LISTENER_TYPE_PAGE_SET = 1;
  static LISTENER_TYPE_SCROLL = 2;

}

class PagerOptions{
  /** @typedef {"vertical" | "horizontal"} PagerType */
  /**
   * @param {boolean} useOverscroll true if use overscroll, false otherwise.
   * @param {boolean} usePointerEvent true if use any pointer events, false otherwise.
   * @param {PagerType} type pager type. one of "vertical", "horizontal".
   */
  constructor(useOverscroll, usePointerEvent, type){
    this.useOverscroll = useOverscroll;
    this.usePointerEvent = usePointerEvent;
    this.type = type;
  }
}

/** @description dummy type which holds all custom page transition methods. use augments jsdoc parameter.
 *  @typedef {Object} PageTransitionMethod */

/** @description The default page transition method object constructor. You can change this using pager.setPageTransitionMethod()
 *  @class DefaultPageTransitionMethod
 *  @augments {PageTransitionMethod} */
class DefaultPageTransitionMethod {

  PAGERMEMORY_SCROLL_AMOUNT = 8;

  constructor() {
    /** @type {Pager}
     *  @description pager object which this method is attached. */
    this.parent = undefined;
  }

  /** @return {string}
   *  @param {number} pageIndex index of page
   *  @description function which returns page positions. must include unit. */
  position(pageIndex) {
    return (pageIndex * (100 / this.PAGERMEMORY_SCROLL_AMOUNT)) + '%';
  }

  /** @return {number}
   *  @param {number} value scroll value
   *  @description function which returns page scroll positions. must not include unit. */
  scrollPage(value) {
    let positionIndex = (this.parent.options.type === 'vertical') ? 1 : 0;
    let scrollAmountPerPage = this.parent.size[positionIndex] / this.PAGERMEMORY_SCROLL_AMOUNT;
    let floatArea = value - Math.floor(value);
    if (this.parent.options.useOverscroll && value < 1) {
      return scrollAmountPerPage * (Math.floor(value) + (3 / 4 + floatArea / 4));
    } else if (this.parent.options.useOverscroll && value > this.parent.pageCount - 2) {
      return scrollAmountPerPage * (Math.floor(value) + 1 / 4 * floatArea);
    } else {
      return scrollAmountPerPage * (Math.floor(value) +
          ((floatArea >= 0.5) ? ((-128) * Math.pow(floatArea - 1, 8) + 1) : 128 * Math.pow(floatArea, 8)));
    }
  }

  /** @return {string}
   *  @param {number} value scroll value
   *  @param {number} pageIndex target page index
   *  @description function which returns page translate value. must include unit. */
  translatePage(value, pageIndex) {
    return '0%';
  }

  /** @return {number}
   *  @param {number} value scroll value
   *  @param {number} pageIndex target page index
   *  @description function which returns page opacity value. must be in 0 ~ 1. */
  opacityPage(value, pageIndex) {
    let validPageMin = ((this.parent.options.useOverscroll) ? 1 : 0);
    let validPageMax = ((this.parent.options.useOverscroll) ? this.parent.pageCount - 2 : this.parent.pageCount - 1);
    if (value >= validPageMin && value <= validPageMax) {
      return Math.max(-2 * Math.abs(value - pageIndex) + 1, 0);
    } else if (value < validPageMin) {
      return Math.max(-1 * pageIndex + 2, 0);
    } else if (value > validPageMax) {
      return Math.max(pageIndex - validPageMax + 1, 0);
    } else {
      // NOT HAPPENED
      return 0;
    }
  }

  /** @return {number}
   *  @param {number} value scroll value
   *  @param {number} pageIndex target page index
   *  @description function which returns page scale value. 1.0 is 100% size, must not include unit. */
  scalePage(value, pageIndex){
    return 1.0;
  }

}