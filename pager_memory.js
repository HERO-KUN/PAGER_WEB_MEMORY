var pagermemory_pagers = {};
var PAGERMEMORY_PAGE_ANIMATE_DURATION = 320;

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
    pageListener: [],
    scrollListener: [],
    pageTransitionMethod: null,
    lockPager: false,
    flags: {
      beforeSelected: 0,
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
      pagermemory_selectPage(this, this.getSelectedPageIndex() + 1, animate);
    },
    selectPrev: function(animate){
      pagermemory_selectPage(this, this.getSelectedPageIndex() - 1, animate);
    },
    getSelectedPageIndex: function(){
      return ((this.options.useOverscroll) ? this.selected - 1 : this.selected);
    },
    addPage: function(position, element){
      pagermemory_addPage(this, position, element);
    },
    removePage: function(position){
      pagermemory_removePage(this, position);
    },
    addPageListener: function(listener){
      this.pageListener.push(listener);
    },
    removePageListener: function(listener){
      this.pageListener.splice(this.pageListener.indexOf(listener), 1);
    },
    removeAllPageListener: function(){
      this.pageListener = [];
    },
    addScrollListener: function(listener){
      this.scrollListener.push(listener);
    },
    removeScrollListener: function(listener){
      this.scrollListener.splice(this.scrollListener.indexOf(listener), 1);
    },
    removeAllScrollListener: function(){
      this.scrollListener = [];
    },
    setPageTransitionMethod: function(method){
      this.pageTransitionMethod = method;
      this.pageTransitionMethod.pager = this;
      pagermemory_notifyPageTransitionMethodUpdated(this);
    }
  }
  pagermemory_setup(pager);
  pagermemory_notifyPagerResized(pager);
  window.addEventListener('resize', function(){pagermemory_notifyPagerResized(pager);});
  window.addEventListener('load', function(){pagermemory_notifyPagerResized(pager);});
  pager.setPageTransitionMethod(new DefaultPageTransitionMethod());
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
  if(pager.lockPager) return;
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
    each.style.overflowY = (pager.options.useOverscroll && (i == 0 || i == childs.length - 1)) ? 'hidden' : 'scroll';
    each.style.position = 'relative';
    each.style.width = '100%';
    each.style.height = '100%';
    each.style.padding = '0';
    each.style.margin = '0';
    each.style.top = (childIndex * -100) + '%';
    pager.items.push(each);
    childIndex++;
  }
  pager.pageCount = childIndex;
  for(var i = 0; i < pager.items.length; i++){
    pager.items[i].style.zIndex = pager.items.length - i;
  }
}

/** @description Internal call only. Re-positions pages according to current page transition method.
 *  @params {object} pager pager object to reposition pages
 */
function pagermemory_notifyPageTransitionMethodUpdated(pager){
  for(var i = 0; i < pager.items.length; i++){
    pager.items[i].style.left = pager.pageTransitionMethod.position(i);
  }
  pager.selectPage(pager.getSelectedPageIndex());
}

/** @description Reset the pager.size property and select the selected item again.
 *  @params {object} pager pager object to notify
 */
function pagermemory_notifyPagerResized(pager){
  pager.size = pagermemory_getSize(pager.object);
  pager.selectPage(pager.getSelectedPageIndex(), false);
}

/** @description Internal call only. Sets pager page without any animations.
 *  @params {object} pager pager object returned by registerPager or getPager
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
 *  @params {object} pager pager object returned by registerPager or getPager
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
 *  @params {object} pager pager object returned by registerPager or getPager
 *  @params {number} value target scroll value
 */
function pagermemory_scrollPage(pager, value){
  if(pager.lockPager) return;
  if(value > pager.itemCount - 1 || value < 0) return;
  if(pager.flags.verticalScrolling) return;
  pager.object.scrollLeft = pager.pageTransitionMethod.scrollPage(value);
  for(var pageIndex = 0; pageIndex < pager.pageCount; pageIndex++){
    pager.items[pageIndex].style.transform =
      'translateX(' + pager.pageTransitionMethod.translatePage(value, pageIndex) + ') ' +
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
 *  @params {object} pager pager data object to perform transition.
 */
function DefaultPageTransitionMethod(){
  var PAGERMEMORY_SCROLL_AMOUNT = 8;

  this.position = function(pageIndex){
    return (pageIndex * (100 / PAGERMEMORY_SCROLL_AMOUNT)) + '%';
  };
  this.scrollPage = function(value) {
    var scrollAmountPerPage = this.pager.size[0]/PAGERMEMORY_SCROLL_AMOUNT;
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

/** @description The zoom out page transition method object constructor. Quallity low.
 *  @params {object} pager pager data object to perform transition.
 */
function ZoomOutPageTransitionMethod(){
  this.position = function(pageIndex) {
    return (pageIndex * 100) + '%';
  };
  this.scrollPage = function(value){
    var floatArea = value - parseInt(value);
    if(this.pager.options.useOverscroll && value < 1){
      return this.pager.size[0] * (Math.floor(value) + (3 / 4 + floatArea / 4));
    }else if(this.pager.options.useOverscroll && value > this.pager.pageCount - 2){
      return this.pager.size[0] * (Math.floor(value) + 1 / 4 * floatArea);
    }else{
      return this.pager.size[0] * (Math.floor(value) +
        ((floatArea >= 0.5) ? ((-8) * Math.pow(floatArea - 1, 4) + 1) : 8 * Math.pow(floatArea, 4)));
    }
  };
  this.translatePage = function(value, pageIndex) {
    return '0%';
  }
  this.scalePage = function(value, pageIndex){
    var floatArea = value - Math.floor(value);
    if(floatArea < 0.2){
      return 1 - floatArea/4;
    }else if(floatArea < 0.8){
      return 0.95;
    }else{
      return 0.95 + (floatArea - 0.8)/4;
    }
  }
  this.opacityPage = function(value, pageIndex){
    var floatArea = value - Math.floor(value);
    if(floatArea < 0.3){
      return 1 - floatArea * 1.5;
    }else if(floatArea < 0.7){
      return 0.55;
    }else{
      return 0.55 + (floatArea - 0.7) * 1.5;
    }
  };
}

/** @description The depth page transition method object constructor. Quallity low.
 *  @params {object} pager pager data object to perform transition.
 */
function DepthPageTransitionMethod(){
  this.position = function(pageIndex) {
    return '0%';
  };
  this.scrollPage = function(value) {
    return 0;
  };
  this.translatePage = function(value, pageIndex) {
    var integer = Math.floor(value);
    var float = value - integer;

    if(pageIndex < integer){
      return '-100%';
    }else if(pageIndex == integer){
      return -1 * ((float >= 0.5) ? ((-8) * Math.pow(float - 1, 4) + 1) : 8 * Math.pow(float, 4)) * 100 + '%';
    } else {
      return '0px';
    }
  };
  this.scalePage = function(value, pageIndex) {
    var integer = Math.floor(value);
    var float = value - integer;

    if(pageIndex != integer){
      return 0.75 + float/4;
    } else {
      return 1;
    }
  };
  this.opacityPage = function(value, pageIndex) {
    var integer = Math.floor(value);
    var float = value - integer;

    if(pageIndex == integer + 1){
      return float;
    } else if(pageIndex > integer + 1) {
      return 0;
    } else {
      return 1;
    }
  };
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
