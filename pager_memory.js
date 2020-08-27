/* pager_memory.js by KouHiro kun */

const PAGERMEMORY_PAGE_ANIMATE_DURATION = 320;

/** @description Pager object.
 *  @typedef {Object} Pager
 *  @property {HTMLElement} object - pager element.
 *  @property {HTMLDivElement[]} items - page items.
 *  @property {number} pageCount - raw page count includes overscroll dummy pages.
 *  @property {number} validPageCount - count of valid pages.
 *  @property {number} selected - current selected item position. excludes dummy pages.
 *  @property {{useOverscroll: boolean, usePointerEvent: boolean, type:string}} options - pager options.
 *  @property {number[]} size size of pager. changes when window.resize.
 *  @property {function[][]} listeners 2-dimension array which holds all types of listeners.
 *  @property {function[]} pageListener list of page changed listeners.
 *  @property {function[]} scrollListener list of scroll changed listeners.
 *  @property {function[]} pageSetChangedListener list of page data set changed listener.
 *  @property {PageTransitionMethod} pageTransitionMethod
 *  @property {boolean} lockPager set this true to lock pager, false otherwise.
 *  @property {PagerFlags} flags flag object related with this pager.
 *  @property {function(target: number, animate: boolean)} selectPage selects target page. 0 is first page.
 *  @property {function(animate: boolean)} selectNext selects next page.
 *  @property {function(animate: boolean)} selectPrev selects previous page.
 *  @property {function()} getSelectedPageIndex get valid selected page index. 0 is first page.
 *  @property {function(position: number, element: HTMLDivElement)} addPage adds div element into pager with given position.
 *  @property {function(position: number)} removePage removes page with given position.
 *  @property {function(position: number)} getPageTitle returns page title which is declared in html with pagermemory_title attribute.
 *  @property {function(type: number, listener: function)} addListener adds listener with given type. use pager.LISTENER_TYPE_* const to type field.
 *  @property {function(type: number, listener: function)} removeListener removes listener with given type. use pager.LISTENER_TYPE_* const to type field.
 *  @property {function(type: number)} removeAllListener removes all listeners matches given type. use pager.LISTENER_TYPE_* const to type field.
 *  @property {function(method: PageTransitionMethod)} setPageTransitionMethod sets page transition method to pager. default is DefaultPageTransitionMethod.
 *  @property {number} LISTENER_TYPE_PAGE readonly, use this to add or remove listeners.
 *  @property {number} LISTENER_TYPE_PAGE_SET readonly, use this to add or remove listeners.
 *  @property {number} LISTENER_TYPE_SCROLL readonly, use this to add or remove listeners.
 */

/**
 *  @description PagerFlags object.
 *  @typedef {Object} PagerFlags
 *  @property {number} beforeSelected readonly. used when page changed. after performing listener action, this value will set to current selected item.
 *  @property {boolean} animating readonly. true if pager is animating, false otherwise.
 *  @property {boolean} pointerDown readonly. true if pointer is down, false otherwise.
 *  @property {number} value readonly. pager scroll amount. if this value is 1.5, this pager is displaying between first page and second page.
 *  @property {number[]} pointerEventStartPos readonly. stores start position of pointer event.
 *  @property {boolean} verticalScrolling readonly. stores that user scrolls vertically(this property is useful when pager type is horizontal)
 *  @property {boolean} horizontalScrolling readonly. stores that user scrolls horizontally(this property is useful when pager type is vertical)
 *  @property {boolean} scrollFixed readonly. stores that user scroll axis(v, h) is fixed and do not apply any further scroll axis change.
 */

/**
 *  @class Pager
 *  @param {HTMLElement} pagerElement target pager element to register
 *  @param {object} options options of pager
 */
function Pager(pagerElement, options){
  let pager = this;
  this.LISTENER_TYPE_PAGE = 0;
  this.LISTENER_TYPE_PAGE_SET = 1;
  this.LISTENER_TYPE_SCROLL = 2;
  this.object = pagerElement;
  this.items = [];
  this.pageCount = 0;
  this.validPageCount = 0;
  this.selected = 0;
  this.options = options;
  this.size = pagermemory_getSize(this.object);
  this.pageListener = [];
  this.scrollListener = [];
  this.pageSetChangedListener = [];
  this.listeners = [this.pageListener, this.pageSetChangedListener, this.scrollListener];
  this.pageTransitionMethod = undefined;
  this.lockPager = false;
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
  this.selectPage = function(target, animate){
    pagermemory_selectPage(this, target, animate);
  };
  this.selectNext = function(animate){
    pagermemory_selectPage(this, this.getSelectedPageIndex() + 1, animate);
  };
  this.selectPrev = function(animate){
    pagermemory_selectPage(this, this.getSelectedPageIndex() - 1, animate);
  };
  this.getSelectedPageIndex = function(){
    return ((this.options.useOverscroll) ? this.selected - 1 : this.selected);
  };
  this.addPage = function(position, element){
    pagermemory_addPage(this, position, element);
  };
  this.removePage = function(position){
    pagermemory_removePage(this, position);
  };
  this.getPageTitle = function(position){
    return pagermemory_getPageTitle(this, position);
  }
  this.addListener = function(type, listener){
    this.listeners[type].push(listener);
  };
  this.removeListener = function(type, listener){
    this.listeners[type].splice(this.listeners[type].indexOf(listener), 1);
  };
  this.removeAllListener = function(type){
    this.listeners[type] = [];
  };
  this.setPageTransitionMethod = function(method){
    this.pageTransitionMethod = method;
    this.pageTransitionMethod.pager = this;
    pagermemory_notifyPageTransitionMethodUpdated(this);
  };
  pagermemory_setup(this);
  pagermemory_notifyPagerResized(this);
  window.addEventListener('resize', function(){pagermemory_notifyPagerResized(pager);});
  window.addEventListener('load', function(){pagermemory_notifyPagerResized(pager);});
  this.setPageTransitionMethod(new DefaultPageTransitionMethod());
  this.selectPage(0, false);
}

/** @description Internal call only. Selects page.
 *  @param {Pager} pager pager object to select page
 *  @param {number} target target page index
 *  @param {boolean} animate enable page translate animation
 */
function pagermemory_selectPage(pager, target, animate){
  if(pager.lockPager) return;
  if(target < 0) return;

  if(target > pager.validPageCount - 1) return;
  let position = pagermemory_mapPageIndex(pager, target);
  if(animate) pagermemory_animatePage(pager, position);
  else pagermemory_setPage(pager, position);
}

/** @description Internal call only. Setup the pager.
 *  @param {Pager} pager pager object returned by Pager constructor or getPager function
 */
function pagermemory_setup(pager){
  pager.object.style.overflow = 'hidden';
  if(pager.options.useOverscroll){
    pager.object.insertBefore(document.createElement('div'), pager.object.childNodes[0]);
    pager.object.appendChild(document.createElement('div'));
  }
  pagermemory_notifyPageUpdated(pager);

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
      pagermemory_scrollPage(pager, value);
    }

    let pointerUp = function(){
      if(pager.flags.animating) return;

      let MAX_PAGE_INDEX = pagermemory_mapPageIndex(pager, pager.validPageCount - 1);
      let MIN_PAGE_INDEX = pagermemory_mapPageIndex(pager, 0);
      let AMOUNT = pager.selected - pager.flags.value;
      if(AMOUNT > 0.1 && pager.selected !== MIN_PAGE_INDEX){
        pagermemory_animatePage(pager, pager.selected - 1);
      }else if(AMOUNT < -0.1 && pager.selected !== MAX_PAGE_INDEX){
        pagermemory_animatePage(pager, pager.selected + 1);
      }else{
        pagermemory_animatePage(pager, pager.selected);
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

/** @description Internal call only. Adds page before given position.
 *  @param {Pager} pager pager object to add a page
 *  @param {number} position position where insert to
 *  @param {HTMLElement} element page object which must be div element
 */
function pagermemory_addPage(pager, position, element){
  if(position < 0) return;
  if(position > pager.validPageCount - 1) {
    if(!pager.options.useOverscroll){
      pager.object.appendChild(element);
    }else{
      pager.object.insertBefore(element, pager.object.lastChild);
    }
  }else{
    pager.object.insertBefore(element, pager.items[pagermemory_mapPageIndex(pager, position)]);
  }
  pagermemory_notifyPageUpdated(pager);
  pagermemory_repositionPage(pager);

  if(position > pager.getSelectedPageIndex())
    pagermemory_setPage(pager, pager.selected);
  else
    pagermemory_setPage(pager, pager.selected + 1);
}

/** @description Internal call only. Removes given position's page.
 *  @param {Pager} pager pager object to remove a page
 *  @param {number} position position where remove to
 */
function pagermemory_removePage(pager, position){
  if(pager.validPageCount === 1) {
    console.error("ERROR : pager must have at least 1 page. you are trying to remove last one page.");
    return;
  }
  if(position < 0) return;
  if(position > pager.validPageCount - 1) return;

  pager.items[pagermemory_mapPageIndex(pager, position)].remove();
  pagermemory_notifyPageUpdated(pager);
  pagermemory_repositionPage(pager);

  if(position >= pager.getSelectedPageIndex())
    pagermemory_setPage(pager, pager.selected);
  else
    pagermemory_setPage(pager, pager.selected - 1);
}

/** @description Internal call only. repositions pages after page set changed.
 *  @param {Pager} pager pager object to reposition
 */
function pagermemory_repositionPage(pager) {
  for(let i = 0; i < pager.items.length; i++){
    if(pager.options.type === 'vertical'){
      pager.items[i].style.top = 'calc(' + (-100 * i) + '% + ' + pager.pageTransitionMethod.position(i) + ')';
    }else{
      pager.items[i].style.left = pager.pageTransitionMethod.position(i);
    }
  }
}

/** @description Internal call only. Returns page title of pager items.
 *  @param {Pager} pager pager object to get titles
 *  @param {number} position position of page
 */
function pagermemory_getPageTitle(pager, position) {
  if(position > pager.validPageCount) return null;
  return pager.items[pagermemory_mapPageIndex(pager, position)].getAttribute('pagermemory_title');
}

/** @description Internal call only. Re-positions pages and update items and pageCount.
 *  @param {Pager} pager pager object to notify page updated
 */
function pagermemory_notifyPageUpdated(pager){
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

/** @description Internal call only. Re-positions pages according to current page transition method.
 *  @param {Pager} pager pager object to reposition pages
 */
function pagermemory_notifyPageTransitionMethodUpdated(pager){
  pagermemory_repositionPage(pager);
  pager.selectPage(pager.getSelectedPageIndex(), false);
}

/** @description Internal call only. Reset the pager.size property and select the selected item again.
 *  @param {Pager} pager pager object to notify
 */
function pagermemory_notifyPagerResized(pager){
  pager.size = pagermemory_getSize(pager.object);
  if(pager.pageTransitionMethod !== undefined)
    pager.selectPage(pager.getSelectedPageIndex(), false);
}

/** @description Internal call only. Sets pager page without any animations.
 *  @param {Pager} pager pager object to set page
 *  @param {number} pageIndex target page index
 */
function pagermemory_setPage(pager, pageIndex){
  if(pager.lockPager) return;
  pagermemory_scrollPage(pager, pageIndex);
  pager.selected = pageIndex;
  pagermemory_performPageListener(pager);
}

/** @description Internal call only. Sets pager page with animation.
 *  @param {Pager} pager pager object to animate
 *  @param {number} pageIndex target page index
 */
function pagermemory_animatePage(pager, pageIndex){
  if(pager.lockPager) return;
  if(pager.flags.animating) return;
  pager.flags.animating = true;
  pagermemory_animate(pager.flags.value, pageIndex, PAGERMEMORY_PAGE_ANIMATE_DURATION,
    function(animatedValue){
      pagermemory_scrollPage(pager, animatedValue);
    },
    function(){
      pager.flags.animating = false;
    }
  );
  pager.selected = pageIndex;
  pagermemory_performPageListener(pager);
}

/** @description Internal call only. Scrolls pager to target value. target value can be 0 ~ pager.pageCount - 1. float values available.
 *  @param {Pager} pager pager object to scroll
 *  @param {number} value target scroll value
 */
function pagermemory_scrollPage(pager, value){
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

/** @description Internal call only. Resets pager items' style.pointerEvents property.
 *  @param {Pager} pager pager object to reset pointerEvents property
 */
function pagermemory_resetPagerItemPointerEvents(pager){
  for(let i = 0; i < pager.items.length; i++){
    if(i === pager.selected) pager.items[i].style.pointerEvents = 'all';
    else pager.items[i].style.pointerEvents = 'none';
  }
}

/**
 * @description Internal call only. Performs Page Listener.
 * @param {Pager} pager pager object to perform listener
 */
function pagermemory_performPageListener(pager){
  if(pager.selected !== pager.flags.beforeSelected){
    for(let i = 0; i < pager.pageListener.length; i++){
      pager.pageListener[i](pager.getSelectedPageIndex());
    }
    pager.flags.beforeSelected = pager.selected;
  }
  pagermemory_resetPagerItemPointerEvents(pager);
}

/**
 *  @description
 *  @typedef {Object} PageTransitionMethod
 *  @property {Pager} pager pager object which this method is attached.
 *  @property {function(pageIndex: number): string} position function which returns page positions. must include unit.
 *  @property {function(value: number): number} scrollPage function which returns page scroll positions. must not include unit.
 *  @property {function(value: number, pageIndex: number): string} translatePage function which returns page translate value. must include unit.
 *  @property {function(value: number, pageIndex: number): number} opacityPage function which returns page opacity value. must be in 0 ~ 1.
 *  @property {function(value: number, pageIndex: number): number} scalePage function which returns page scale value. 1.0 is 100% size, must not include unit.
 */

/** @description The default page transition method object constructor. You can change this using pager.setPageTransitionMethod()
 *  @class DefaultPageTransitionMethod
 *  @augments {PageTransitionMethod}
 *  @type {PageTransitionMethod}
 */
function DefaultPageTransitionMethod(){
  const PAGERMEMORY_SCROLL_AMOUNT = 8;

  this.pager = undefined;
  this.position = function(pageIndex){
    return (pageIndex * (100 / PAGERMEMORY_SCROLL_AMOUNT)) + '%';
  };
  this.scrollPage = function(value) {
    let positionIndex = (this.pager.options.type === 'vertical') ? 1 : 0;
    let scrollAmountPerPage = this.pager.size[positionIndex]/PAGERMEMORY_SCROLL_AMOUNT;
    let floatArea = value - Math.floor(value);
    if(this.pager.options.useOverscroll && value < 1){
      return scrollAmountPerPage * (Math.floor(value) + (3 / 4 + floatArea / 4));
    }else if(this.pager.options.useOverscroll && value > this.pager.pageCount - 2){
      return scrollAmountPerPage * (Math.floor(value) + 1 / 4 * floatArea);
    }else{
      return scrollAmountPerPage * (Math.floor(value) +
        ((floatArea >= 0.5) ? ((-128) * Math.pow(floatArea - 1, 8) + 1) : 128 * Math.pow(floatArea, 8)));
    }
  };
  this.translatePage = function() {
    return '0%';
  }
  this.opacityPage = function(value, pageIndex) {
    let validPageMin = ((this.pager.options.useOverscroll) ? 1 : 0);
    let validPageMax = ((this.pager.options.useOverscroll) ? this.pager.pageCount - 2 : this.pager.pageCount - 1);
    if(value >= validPageMin && value <= validPageMax){
      return Math.max(-2 * Math.abs(value - pageIndex) + 1, 0);
    }else if(value < validPageMin){
      return Math.max(-1 * pageIndex + 2, 0);
    }else if(value > validPageMax){
      return Math.max(pageIndex - validPageMax + 1, 0);
    }else{
      // NOT HAPPENED
      return 0;
    }
  };
  this.scalePage = function(){
    return 1.0;
  }
}

/** @description Internal call only. Animates value linearly.
 *  @param {number} from start value
 *  @param {number} to end value
 *  @param {number} duration animate duration
 *  @param {function} step function that called every frame
 *  @param {function} finish function that called when animate finished
 */
function pagermemory_animate(from, to, duration, step, finish){
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

/** @description Internal call only. Returns mapped page index related with pager.options.useOverscroll
 *  @param {Pager} pager pager object to follow overscroll option
 *  @param {number} position position of pager which will be mapped
 */
function pagermemory_mapPageIndex(pager, position){
  return position + (pager.options.useOverscroll ? 1 : 0);
}

/** @description Internal call only. Returns size of element.
 *  @param {HTMLElement} element target element
 *  @return {number[]}
 */
function pagermemory_getSize(element){
  let rect = element.getBoundingClientRect();
  if(rect.width !== 0 && rect.height !== 0){
    return [rect.width, rect.height];
  } else {
    return [rect.right - rect.left, rect.bottom - rect.top];
  }
}
