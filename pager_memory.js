var pagermemory_pagers = {};
var PAGERMEMORY_PAGE_ANIMATE_DURATION = 320;
var PAGERMEMORY_SCROLL_AMOUNT = 6;

/** @description Regiester a pager element to script. returns pager object.
 *  @params {string} name identifier of pager that must be unique
 *  @params {element} pagerElement target pager element to regiester
 *  @params {object} options options of pager
 *  @return {object}
 */
function pagermemory_registerPager(name, pagerElement, options){
  pagermemory_pagers[name] = {
    name: name,
    object: pagerElement,
    items: [],
    pageCount: 0,
    selected: 0,
    options: options,
    size: pagermemory_getSize(pagerElement),
    listener: function() {},
    flags: {
      animating: false,
      pointerDown: false,
      value: 0,
      beforePos: 0,
      pointerEventStartPos: [0, 0]
    },
    selectPage: function(target, animate){
      pagermemory_selectPage(this, target, animate);
    },
    selectNext: function(animate){
      pagermemory_selectPage(this, this.options.useOverscroll ? this.selected : this.selected+1, animate);
    },
    selectPrev: function(animate){
      pagermemory_selectPage(this, this.options.useOverscroll ? this.selected-2 : this.selected-1, animate);
    },
    getSelectedPageIndex: function(){
      return ((this.options.useOverscroll) ? this.selected - 1 : this.selected)
    }
  }
  pagermemory_setup(pagermemory_pagers[name]);
  pagermemory_setPage(pagermemory_pagers[name], options.useOverscroll ? 1 : 0);
  return pagermemory_pagers[name];
}

/** @description Returns regiestered pager object which has given name.
 *  @params {string} name pager name to get
 */
function pagermemory_getPager(name){
  return pagermemory_pagers[name];
}

/** @description Internal call only. Selects page.
 *  @params {object} pager pager object returned by regiesterPager or getPager
 *  @params {number} target target page index
 *  @params {boolean} animate enable page translate animation
 */
function pagermemory_selectPage(pager, target, animate){
  if(target < 0) return;
  if(pager.options.useOverscroll) target++;
  if(target > pager.pageCount-(pager.options.useOverscroll ? 2 : 1)) return;
  if(animate) pagermemory_animatePage(pager, target);
  else pagermemory_setPage(pager, target);
}

/** @description Internal call only. Setup the pager.
 *  @params {object} pager pager object returned by regiesterPager or getPager
 */
function pagermemory_setup(pager){
  pager.object.style.overflow = 'hidden';
  if(pager.options.useOverscroll){
    pager.object.insertBefore(document.createElement('div'), pager.object.childNodes[0]);
    pager.object.appendChild(document.createElement('div'));
  }
  var childs = pager.object.childNodes;
  var childIndex = 0;
  for (var i = 0; i < childs.length; i++) {
    if(childs[i].nodeType != 1) continue;
    each = childs[i];
    each.style.overflowY = 'scroll';
    each.style.position = 'relative';
    each.style.width = '100%';
    each.style.height = '100%';
    each.style.padding = '0';
    each.style.margin = '0';
    each.style.top = (childIndex * -pager.size[1]) + 'px';
    each.style.left = (childIndex * (pager.size[0] / PAGERMEMORY_SCROLL_AMOUNT)) + 'px';
    pager.items.push(each);
    childIndex++;
  }
  pager.pageCount = childIndex;

  if(pager.options.usePointerEvent){

    var pointerDown = function(x, y) {
      if(pager.flags.animating) return;
      pager.flags.pointerDown = true;
      pager.flags.beforePos = pager.object.scrollLeft;
      pager.flags.pointerEventStartPos = [x, y];
    };

    var pointerMove = function(x, y) {
      if(pager.flags.animating) return;
      if(!pager.flags.pointerDown) return;
      var value = pager.selected + (1/pager.size[0]*(pager.flags.pointerEventStartPos[0] - x));
      pagermemory_scrollPage(pager, value);
    }

    var pointerUp = function(){
      if(pager.flags.animating) return;
      var MAX_PAGE = ((pager.options.useOverscroll) ? pager.pageCount - 2 : pager.pageCount - 1);
      var MIN_PAGE = ((pager.options.useOverscroll) ? 1 : 0);
      var AMOUNT = pager.selected - pager.flags.value;
      if(AMOUNT > 0.1 && pager.selected != MIN_PAGE){
        pagermemory_animatePage(pager, pager.selected - 1);
      }else if(AMOUNT < -0.1 && pager.selected != MAX_PAGE){
        pagermemory_animatePage(pager, pager.selected + 1);
      }else{
        pagermemory_animatePage(pager, pager.selected);
      }
      pager.flags.pointerDown = false;
      pager.flags.beforePos = 0;
      pager.flags.pointerEventStartPos = [0, 0];
    }

    pager.object.addEventListener('mousedown', function(event) { pointerDown(event.pageX, event.pageY) });
    pager.object.addEventListener('mousemove', function(event) { pointerMove(event.pageX, event.pageY); });
    window.addEventListener('mouseup', function(event) { pointerUp() });

    pager.object.addEventListener('touchstart', function(event) { pointerDown(event.touches[0].clientX, event.touches[0].clientY); });
    pager.object.addEventListener('touchmove', function(event) { pointerMove(event.touches[0].clientX, event.touches[0].clientY); });
    window.addEventListener('touchend', function(event) { pointerUp(); });

  }
}

/** @description Internal call only. Sets pager page without any animations.
 *  @params {object} pager pager object returned by regiesterPager or getPager
 *  @params {number} pageIndex target page index
 */
function pagermemory_setPage(pager, pageIndex){
  pagermemory_scrollPage(pager, pageIndex);
  pager.selected = pageIndex;
}

/** @description Internal call only. Sets pager page with animation.
 *  @params {object} pager pager object returned by regiesterPager or getPager
 *  @params {number} pageIndex target page index
 */
function pagermemory_animatePage(pager, pageIndex){
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
}

/** @description Internal call only. Scrolls pager to target value. target value can be 0 ~ pager.pageCount - 1. float values available.
 *  @params {object} pager pager object returned by regiesterPager or getPager
 *  @params {number} value target scroll value
 */
function pagermemory_scrollPage(pager, value){
  if(value > pager.itemCount - 1 || value < 0) return;
  var scrollAmountPerPage = pager.size[0]/PAGERMEMORY_SCROLL_AMOUNT;
  var realValue = value - parseInt(value);
  if(pager.options.useOverscroll && value < 1){
    pager.object.scrollLeft = scrollAmountPerPage * Math.floor(value) +
      scrollAmountPerPage * (3 / 4 + realValue / 4);
  }else if(pager.options.useOverscroll && value > pager.pageCount - 2){
    pager.object.scrollLeft = scrollAmountPerPage * Math.floor(value) +
      scrollAmountPerPage / 4 * realValue;
  }else{
    pager.object.scrollLeft = scrollAmountPerPage * Math.floor(value) +
      ((realValue >= 0.5) ?
        scrollAmountPerPage * ((-32) * Math.pow(realValue - 1, 6) + 1) :
        scrollAmountPerPage * 32 * Math.pow(realValue, 6));
  }
  for(var pageIndex = 0; pageIndex < pager.pageCount; pageIndex++){
    if(value >= ((pager.options.useOverscroll) ? 1 : 0) && value <= ((pager.options.useOverscroll) ? pager.pageCount - 2 : pager.pageCount - 1)){
      pager.items[pageIndex].style.opacity = Math.max(-2 * Math.abs(value - pageIndex) + 1, 0);
    }
    pager.items[pageIndex].style.pointerEvents = (pager.items[pageIndex].style.opacity < 0.5) ? 'none' : 'all';
  }
  pager.flags.value = value;
}

/** @descrition Internal call only. Animates value linearly.
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
