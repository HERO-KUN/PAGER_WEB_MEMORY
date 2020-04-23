var pagermemory_pagers = {};
var PAGERMEMORY_PAGE_ANIMATE_DURATION = 320;
var PAGERMEMORY_SCROLL_AMOUNT = 8;

/** @description Register a pager element to script. returns pager object.
 *  @params {string} name identifier of pager that must be unique
 *  @params {element} pagerElement target pager element to regiester
 *  @params {object} options options of pager
 *  @return {object}
 */
function pagermemory_registerPager(name, pagerElement, options){
  var pager = {
    name: name,
    object: pagerElement,
    items: [],
    pageCount: 0,
    selected: 0,
    options: options,
    size: pagermemory_getSize(pagerElement),
    listener: function(page) {},
    flags: {
      animating: false,
      pointerDown: false,
      value: 0,
      beforePos: 0,
      pointerEventStartPos: [0, 0],
      verticalScrolling: false,
      scrollFixed: false
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
    },
    addPage: function(position, element){
      pagermemory_addPage(this, position, element);
    },
    removePage: function(position){
      pagermemory_removePage(this, position);
    }
  }
  pagermemory_setup(pager);
  var resize = function(){
    pager.size = pagermemory_getSize(pager.object);
    pager.selectPage(pager.getSelectedPageIndex(), false);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('load', resize);
  pager.selectPage(0);
  pagermemory_pagers[name] = pager;
  return pagermemory_pagers[name];
}

/** @description Returns regiestered pager object which has given name.
 *  @params {string} name pager name to get
 *  @return {object}
 */
function pagermemory_getPager(name){
  return pagermemory_pagers[name];
}

/** @description Internal call only. Selects page.
 *  @params {object} pager pager object returned by registerPager or getPager
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
 *  @params {object} pager pager object returned by registerPager or getPager
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
      pager.flags.beforePos = pager.object.scrollLeft;
      pager.flags.pointerEventStartPos = [x, y];
    };

    var pointerMove = function(x, y) {
      if(pager.flags.animating) return;
      if(!pager.flags.pointerDown) return;
      if(!pager.flags.scrollFixed){
        pager.flags.verticalScrolling = Math.abs(x - pager.flags.pointerEventStartPos[0]) < Math.abs(y - pager.flags.pointerEventStartPos[1]);
        pager.flags.scrollFixed = (Math.abs(x - pager.flags.pointerEventStartPos[0]) > 10 || Math.abs(y - pager.flags.pointerEventStartPos[1]) > 10);
      }
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
      pager.flags.verticalScrolling = false;
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
 *  @params {object} pager pager object returned by registerPager or getPager
 *  @params {number} position position where insert to
 *  @params {element} element page object which must be div element
 */
function pagermemory_addPage(pager, position, element){
  if(position < 0) return;
  if(pager.options.useOverscroll) position++;

  if(position > pager.pageCount-(pager.options.useOverscroll ? 2 : 1)) {
    if(!pager.options.useOverscroll){
      pager.object.appendChild(element);
    }else{
      pager.object.insertBefore(element, pager.object.lastChild);
    }
  }else{
    pager.object.insertBefore(element, pager.items[position]);
  }
  pagermemory_notifyPageUpdated(pager);

  if(position - (pager.options.useOverscroll ? 1 : 0) > pager.getSelectedPageIndex())
    pagermemory_setPage(pager, pager.selected);
  else
    pagermemory_setPage(pager, pager.selected + 1);
}

/** @description Internal call only. Removes given position's page.
 *  @params {object} pager pager object returned by registerPager or getPager
 *  @params {number} position position where remove to
 */
function pagermemory_removePage(pager, position){
  if(pager.pageCount == (pager.options.useOverscroll ? 3 : 1)) {
    console.error("ERROR : pager must have at least 1 page. you are trying to remove last one page.");
    return;
  }
  if(position < 0) return;
  if(pager.options.useOverscroll) position++;
  if(position > pager.pageCount-(pager.options.useOverscroll ? 2 : 1)) return;

  pager.items[position].remove();
  pagermemory_notifyPageUpdated(pager);

  if(position - (pager.options.useOverscroll ? 1 : 0) >= pager.getSelectedPageIndex())
    pagermemory_setPage(pager, pager.selected);
  else
    pagermemory_setPage(pager, pager.selected - 1);
}

/** @description Internal call only. Re-positions pages and update items and pageCount.
 *  @params {object} pager pager object returned by registerPager or getPage
 */
function pagermemory_notifyPageUpdated(pager){
  var childs = pager.object.childNodes;
  var childIndex = 0;
  pager.items = [];
  for (var i = 0; i < childs.length; i++) {
    if(childs[i].nodeType != 1) continue;
    each = childs[i];
    each.style.overflowY = 'scroll';
    each.style.position = 'relative';
    each.style.width = '100%';
    each.style.height = '100%';
    each.style.padding = '0';
    each.style.margin = '0';
    each.style.top = (childIndex * -100) + '%';
    each.style.left = (childIndex * (100 / PAGERMEMORY_SCROLL_AMOUNT)) + '%';
    pager.items.push(each);
    childIndex++;
  }
  pager.pageCount = childIndex;
}

/** @description Internal call only. Sets pager page without any animations.
 *  @params {object} pager pager object returned by registerPager or getPager
 *  @params {number} pageIndex target page index
 */
function pagermemory_setPage(pager, pageIndex){
  pagermemory_scrollPage(pager, pageIndex);
  pager.selected = pageIndex;
  pager.listener(pager.getSelectedPageIndex());
}

/** @description Internal call only. Sets pager page with animation.
 *  @params {object} pager pager object returned by registerPager or getPager
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
  pager.listener(pager.getSelectedPageIndex());
}

/** @description Internal call only. Scrolls pager to target value. target value can be 0 ~ pager.pageCount - 1. float values available.
 *  @params {object} pager pager object returned by registerPager or getPager
 *  @params {number} value target scroll value
 */
function pagermemory_scrollPage(pager, value){
  if(value > pager.itemCount - 1 || value < 0) return;
  if(pager.flags.verticalScrolling) return;
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
        scrollAmountPerPage * ((-128) * Math.pow(realValue - 1, 8) + 1) :
        scrollAmountPerPage * 128 * Math.pow(realValue, 8));
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
