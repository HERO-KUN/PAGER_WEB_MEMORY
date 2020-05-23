/* pager_memory.js by KouHiro kun */

var PAGERMEMORY_PAGE_ANIMATE_DURATION = 320;

/** @description Register a pager element to script. returns pager object.
 *  @params {element} pagerElement target pager element to regiester
 *  @params {object} options options of pager
 *  @return {object}
 */
function Pager(pagerElement, options){
  let pager = this;
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
  this.pageTransitionMethod = null;
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
  },
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
  this.addPageListener = function(listener){
    this.pageListener.push(listener);
  };
  this.removePageListener = function(listener){
    this.pageListener.splice(this.pageListener.indexOf(listener), 1);
  };
  this.removeAllPageListener = function(){
    this.pageListener = [];
  };
  this.addScrollListener = function(listener){
    this.scrollListener.push(listener);
  };
  this.removeScrollListener = function(listener){
    this.scrollListener.splice(this.scrollListener.indexOf(listener), 1);
  };
  this.removeAllScrollListener = function(){
    this.scrollListener = [];
  };
  this.addPageSetChangeListener = function(listener) {
    this.pageSetChangedListener.push(listener);
  }
  this.removePageSetChangeListener = function(listener) {
    this.pageSetChangedListener.splice(this.pageSetChangedListener.indexOf(listener), 1);
  }
  this.removeAllPageSetChangeListener = function() {
    this.pageSetChangedListener = [];
  }
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
  this.selectPage(0);
}

/** @description Internal call only. Selects page.
 *  @params {object} pager pager object to select page
 *  @params {number} target target page index
 *  @params {boolean} animate enable page translate animation
 */
function pagermemory_selectPage(pager, target, animate){
  if(pager.lockPager) return;
  if(target < 0) return;

  if(target > pager.validPageCount - 1) return;
  var position = pagermemory_mapPageIndex(pager, target);
  if(animate) pagermemory_animatePage(pager, position);
  else pagermemory_setPage(pager, position);
}

/** @description Internal call only. Setup the pager.
 *  @params {object} pager pager object returned by Pager constructor or getPager function
 */
function pagermemory_setup(pager){
  pager.object.style.overflow = 'hidden';
  if(pager.options.useOverscroll){
    pager.object.insertBefore(document.createElement('div'), pager.object.childNodes[0]);
    pager.object.appendChild(document.createElement('div'));
  }
  pagermemory_notifyPageUpdated(pager);

  if(pager.options.usePointerEvent){

    var pointerDown = function(x, y) {
      if(pager.flags.animating) return;
      pager.flags.pointerDown = true;
      pager.flags.pointerEventStartPos = [x, y];
    };

    var pointerMove = function(x, y) {
      if(pager.flags.animating) return;
      if(!pager.flags.pointerDown) return;
      if(!pager.flags.scrollFixed){
        pager.flags.verticalScrolling = Math.abs(x - pager.flags.pointerEventStartPos[0]) < Math.abs(y - pager.flags.pointerEventStartPos[1]);
        pager.flags.horizontalScrolling = !pager.flags.verticalScrolling;
        pager.flags.scrollFixed = (Math.abs(x - pager.flags.pointerEventStartPos[0]) > 10 || Math.abs(y - pager.flags.pointerEventStartPos[1]) > 10);
      }
      var positionIndex = (pager.options.type == 'vertical') ? 1 : 0;
      var value = pager.selected + (1/pager.size[positionIndex]*(pager.flags.pointerEventStartPos[positionIndex] - ((pager.options.type == 'vertical') ? y : x)));
      pagermemory_scrollPage(pager, value);
    }

    var pointerUp = function(){
      if(pager.flags.animating) return;

      var MAX_PAGE_INDEX = pagermemory_mapPageIndex(pager, pager.validPageCount - 1);
      var MIN_PAGE_INDEX = pagermemory_mapPageIndex(pager, 0);
      var AMOUNT = pager.selected - pager.flags.value;
      if(AMOUNT > 0.1 && pager.selected != MIN_PAGE_INDEX){
        pagermemory_animatePage(pager, pager.selected - 1);
      }else if(AMOUNT < -0.1 && pager.selected != MAX_PAGE_INDEX){
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
    window.addEventListener('mouseup', function(event) { pointerUp() });

    pager.object.addEventListener('touchstart', function(event) { pointerDown(event.touches[0].clientX, event.touches[0].clientY); });
    pager.object.addEventListener('touchmove', function(event) { pointerMove(event.touches[0].clientX, event.touches[0].clientY); });
    window.addEventListener('touchend', function(event) { pointerUp(); });

  }
}

/** @description Internal call only. Adds page before given position.
 *  @params {object} pager pager object to add a page
 *  @params {number} position position where insert to
 *  @params {element} element page object which must be div element
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
 *  @params {object} pager pager object to remove a page
 *  @params {number} position position where remove to
 */
function pagermemory_removePage(pager, position){
  if(pager.validPageCount == 1) {
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
 *  @params {object} pager pager object to reposition
 */
function pagermemory_repositionPage(pager) {
  for(var i = 0; i < pager.items.length; i++){
    if(pager.options.type == 'vertical'){
      pager.items[i].style.top = 'calc(' + (-100 * i) + '% + ' + pager.pageTransitionMethod.position(i) + ')';
    }else{
      pager.items[i].style.left = pager.pageTransitionMethod.position(i);
    }
  }
}

/** @description Internal call only. Returns page title of pager items.
 *  @params {object} pager pager object to get titles
 *  @params {number} position position of page
 */
function pagermemory_getPageTitle(pager, position) {
  if(position > pager.validPageCount) return null;
  return pager.items[pagermemory_mapPageIndex(pager, position)].getAttribute('pagermemory_title');
}

/** @description Internal call only. Re-positions pages and update items and pageCount.
 *  @params {object} pager pager object to notify page updated
 */
function pagermemory_notifyPageUpdated(pager){
  var childs = pager.object.childNodes;
  var childIndex = 0;
  pager.items = [];
  for (var i = 0; i < childs.length; i++) {
    if(childs[i].nodeType != 1) childs[i].remove();
  }
  for (var i = 0; i < childs.length; i++) {
    if(childs[i].nodeType != 1) continue;
    each = childs[i];
    each.style.overflowY = (pager.options.useOverscroll && (i == 0 || i == childs.length - 1)) ? 'hidden' : 'auto';
    each.style.position = 'relative';
    each.style.width = '100%';
    each.style.height = '100%';
    each.style.padding = '0';
    each.style.margin = '0';
    if(pager.options.type == 'vertical'){
      each.style.left = (childIndex * -100) + '%';
    }else{
      each.style.top = (childIndex * -100) + '%';
    }
    pager.items.push(each);
    childIndex++;
  }
  pager.pageCount = childIndex;
  pager.validPageCount = childIndex - (pager.options.useOverscroll ? 2 : 0);
  for(var i = 0; i < pager.items.length; i++){
    pager.items[i].style.zIndex = pager.items.length - i;
  }
  for(var i = 0; i < pager.pageSetChangedListener.length; i++){
    pager.pageSetChangedListener[i](pager.validPageCount);
  }
}

/** @description Internal call only. Re-positions pages according to current page transition method.
 *  @params {object} pager pager object to reposition pages
 */
function pagermemory_notifyPageTransitionMethodUpdated(pager){
  for(var i = 0; i < pager.items.length; i++){
    if(pager.options.type == 'vertical'){
      pager.items[i].style.top = 'calc(' + (-100 * i) + '% + ' + pager.pageTransitionMethod.position(i) + ')';
    }else{
      pager.items[i].style.left = pager.pageTransitionMethod.position(i);
    }
  }
  pager.selectPage(pager.getSelectedPageIndex());
}

/** @description Reset the pager.size property and select the selected item again.
 *  @params {object} pager pager object to notify
 */
function pagermemory_notifyPagerResized(pager){
  pager.size = pagermemory_getSize(pager.object);
  if(pager.pageTransitionMethod != null)
    pager.selectPage(pager.getSelectedPageIndex(), false);
}

/** @description Internal call only. Sets pager page without any animations.
 *  @params {object} pager pager object to set page
 *  @params {number} pageIndex target page index
 */
function pagermemory_setPage(pager, pageIndex){
  if(pager.lockPager) return;
  pagermemory_scrollPage(pager, pageIndex);
  pager.selected = pageIndex;
  if(pager.selected != pager.flags.beforeSelected){
    for(var i = 0; i < pager.pageListener.length; i++){
      pager.pageListener[i](pager.getSelectedPageIndex());
    }
    pager.flags.beforeSelected = pager.selected;
  }
  pagermemory_resetPagerItemPointerEvents(pager);
}

/** @description Internal call only. Sets pager page with animation.
 *  @params {object} pager pager object to animate
 *  @params {number} pageIndex target page index
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
  if(pager.selected != pager.flags.beforeSelected){
    for(var i = 0; i < pager.pageListener.length; i++){
      pager.pageListener[i](pager.getSelectedPageIndex());
    }
    pager.flags.beforeSelected = pager.selected;
  }
  pagermemory_resetPagerItemPointerEvents(pager);
}

/** @description Internal call only. Scrolls pager to target value. target value can be 0 ~ pager.pageCount - 1. float values available.
 *  @params {object} pager pager object to scroll
 *  @params {number} value target scroll value
 */
function pagermemory_scrollPage(pager, value){
  if(pager.lockPager) return;
  if(value > pager.itemCount - 1 || value < 0) return;
  if(pager.options.type != 'vertical' && pager.flags.verticalScrolling) return;
  if(pager.options.type == 'vertical' && pager.flags.horizontalScrolling) return;
  if(pager.options.type == 'vertical'){
    pager.object.scrollTop = pager.pageTransitionMethod.scrollPage(value);
  }else{
    pager.object.scrollLeft = pager.pageTransitionMethod.scrollPage(value);
  }
  for(var pageIndex = 0; pageIndex < pager.pageCount; pageIndex++){
    var translateType = (pager.options.type == 'vertical') ? 'Y' : 'X';
    pager.items[pageIndex].style.transform =
      'translate' + translateType + '(' + pager.pageTransitionMethod.translatePage(value, pageIndex) + ') ' +
      'scale(' + pager.pageTransitionMethod.scalePage(value, pageIndex) + ')';
    pager.items[pageIndex].style.opacity = pager.pageTransitionMethod.opacityPage(value, pageIndex);
  }
  for(var i = 0; i < pager.scrollListener.length; i++){
    pager.scrollListener[i](pager.options.useOverscroll ? value-1 : value);
  }
  pager.flags.value = value;
}

/** @description Internal call only. Resets pager items' style.pointerEvents property.
 *  @params {object} pager pager object to reset pointerEvents property
 */
function pagermemory_resetPagerItemPointerEvents(pager){
  for(var i = 0; i < pager.items.length; i++){
    if(i == pager.selected) pager.items[i].style.pointerEvents = 'all';
    else pager.items[i].style.pointerEvents = 'none';
  }
}

/** @description The default page transition method object constructor. You can change this using pager.setPageTransitionMethod()
 */
function DefaultPageTransitionMethod(){
  var PAGERMEMORY_SCROLL_AMOUNT = 8;

  this.position = function(pageIndex){
    return (pageIndex * (100 / PAGERMEMORY_SCROLL_AMOUNT)) + '%';
  };
  this.scrollPage = function(value) {
    var positionIndex = (this.pager.options.type == 'vertical') ? 1 : 0;
    var scrollAmountPerPage = this.pager.size[positionIndex]/PAGERMEMORY_SCROLL_AMOUNT;
    var floatArea = value - parseInt(value);
    if(this.pager.options.useOverscroll && value < 1){
      return scrollAmountPerPage * (Math.floor(value) + (3 / 4 + floatArea / 4));
    }else if(this.pager.options.useOverscroll && value > this.pager.pageCount - 2){
      return scrollAmountPerPage * (Math.floor(value) + 1 / 4 * floatArea);
    }else{
      return scrollAmountPerPage * (Math.floor(value) +
        ((floatArea >= 0.5) ? ((-128) * Math.pow(floatArea - 1, 8) + 1) : 128 * Math.pow(floatArea, 8)));
    }
  };
  this.translatePage = function(value, pageIndex) {
    return '0%';
  }
  this.opacityPage = function(value, pageIndex) {
    if(value >= ((this.pager.options.useOverscroll) ? 1 : 0) &&
       value <= ((this.pager.options.useOverscroll) ? this.pager.pageCount - 2 : this.pager.pageCount - 1)){
      return Math.max(-2 * Math.abs(value - pageIndex) + 1, 0);
    }
  };
  this.scalePage = function(value, pageIndex){
    return '100%';
  }
}

/** @description Internal call only. Animates value linearly.
 *  @params {number} from start value
 *  @params {number} to end value
 *  @params {number} duration animate duration
 *  @params {function} step function that called every frame
 *  @params {function} finish function that called when animate finished
 */
function pagermemory_animate(from, to, duration, step, finish){
  if(from == to)  { finish(); return; }
  var progress = 0;
  var animatedValue = from;
  var DELTA = Math.abs(to - from);
  var DIRECTION = (to - from > 0) ? 1 : -1;
  var STEP_LENGTH_MS = 10;
  var STEP_LENGTH = DELTA/(duration/STEP_LENGTH_MS);
  var animate = function(){
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
 *  @params {object} pager pager object to follow overscroll option
 *
 */
function pagermemory_mapPageIndex(pager, position){
  return position + (pager.options.useOverscroll ? 1 : 0);
}

/** @description Internal call only. Returns size of element.
 *  @params {element} element target element
 *  @return {float-array}
 */
function pagermemory_getSize(element){
  var rect = element.getBoundingClientRect();
  if(rect.width != 0 && rect.height != 0){
    return [rect.width, rect.height];
  } else {
    return [rect.right - rect.left, rect.bottom - rect.top];
  }
}
