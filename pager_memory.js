var pagermemory_pagers = {};
var PAGERMEMORY_PAGE_ANIMATE_DURATION = 320;
var PAGERMEMORY_SCROLL_AMOUNT = 6;

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
      scrollLeft: 0,
      beforePos: 0,
      pointerEventStartPos: [0, 0]
    }
  }
  pagermemory_setup(pagermemory_pagers[name]);
  pagermemory_setPage(pagermemory_pagers[name], options.useOverscroll ? 1 : 0);
  return pagermemory_pagers[name];
}

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
  pager.object.addEventListener('scroll', function(e){
    var MAX_SCROLL_X = pager.size[0] / PAGERMEMORY_SCROLL_AMOUNT * (pager.pageCount - 1);
    for(var itemIndex = 0; itemIndex < pager.pageCount; itemIndex++){
      if(pager.object.scrollLeft >= pager.size[0]/PAGERMEMORY_SCROLL_AMOUNT && pager.object.scrollLeft <= pager.size[0]/PAGERMEMORY_SCROLL_AMOUNT * (pager.pageCount - 2))
        pager.items[itemIndex].style.opacity = Math.max((-1) * Math.pow(((pager.pageCount - 1) * 2 / MAX_SCROLL_X * pager.object.scrollLeft) - 2 * itemIndex, 2) + 1, 0);

      if(pager.items[itemIndex].style.opacity < 0.5) pager.items[itemIndex].style.pointerEvents = 'none';
      else pager.items[itemIndex].style.pointerEvents = 'all';
    }
  });

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
      if(pager.object.scrollLeft >= pager.size[0]/PAGERMEMORY_SCROLL_AMOUNT && pager.object.scrollLeft <= pager.size[0]/PAGERMEMORY_SCROLL_AMOUNT * (pager.pageCount - 2))
        pager.object.scrollLeft = pager.flags.beforePos + (pager.flags.pointerEventStartPos[0] - x)/PAGERMEMORY_SCROLL_AMOUNT;
      else
        pager.object.scrollLeft = pager.flags.beforePos + (pager.flags.pointerEventStartPos[0] - x)/PAGERMEMORY_SCROLL_AMOUNT/2.5;
      pager.flags.scrollLeft = pager.object.scrollLeft;
    }

    var pointerUp = function(){
      if(pager.flags.animating) return;
      var MAX_PAGE = ((pager.options.useOverscroll) ? pager.pageCount - 2 : pager.pageCount - 1);
      var MIN_PAGE = ((pager.options.useOverscroll) ? 1 : 0);
      var AMOUNT = pager.selected * pager.size[0]/PAGERMEMORY_SCROLL_AMOUNT - pager.flags.scrollLeft;
      if(AMOUNT > 15 && pager.selected != MIN_PAGE){
        pagermemory_animatePage(pager, pager.selected - 1);
        pager.selected--;
      }else if(AMOUNT < -15 && pager.selected != MAX_PAGE){
        pagermemory_animatePage(pager, pager.selected + 1);
        pager.selected++;
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

/** @description Sets pager page without any animations.
 *  @params {object} pager pager object returned by regiesterPager or getPager
 *  @params {number} pageIndex target page index
 */
function pagermemory_setPage(pager, pageIndex){
  for(var childIndex = 0; childIndex < pager.pageCount; childIndex++){
    pager.items[childIndex].style.opacity = (childIndex == pageIndex) ? '1' : '0';
    pager.items[childIndex].style.pointerEvents = (childIndex == pageIndex) ? 'all' : 'none';
  }
  pager.object.scrollLeft = pager.size[0] / PAGERMEMORY_SCROLL_AMOUNT * pageIndex;
  pager.flags.scrollLeft = pager.size[0] / PAGERMEMORY_SCROLL_AMOUNT * pageIndex;
  pager.selected = pageIndex;
}

function pagermemory_animatePage(pager, pageIndex){
  if(pager.flags.animating) return;
  pager.flags.animating = true;
  pagermemory_animate(pager.flags.scrollLeft, pager.size[0] / PAGERMEMORY_SCROLL_AMOUNT * pageIndex, PAGERMEMORY_PAGE_ANIMATE_DURATION,
    function(animatedValue){
      pager.object.scrollLeft = animatedValue;
    },
    function(){
      pager.flags.scrollLeft = pager.size[0] / PAGERMEMORY_SCROLL_AMOUNT * pageIndex;
      pager.flags.animating = false;
    }
  );
}

function pagermemory_animate(from, to, duration, step, finish){
  if(from == to)  { finish(); return; }
  var progress = 0;
  var animatedValue = from;
  var DELTA = Math.abs(to - from);
  var DIRECTION = (to - from > 0) ? 1 : -1;
  var STEP_LENGTH_MS = 10;
  var STEP_LENGTH = Math.sqrt(DELTA)/(duration/STEP_LENGTH_MS);
  var animate = function(){
    if(duration <= progress * STEP_LENGTH_MS) {
      step(to);
      finish();
      return;
    }
    animatedValue = from + DIRECTION * ((-1) * Math.pow(progress * STEP_LENGTH - Math.sqrt(DELTA), 2) + DELTA);
    step(animatedValue);
    progress++;
    setTimeout(animate, STEP_LENGTH_MS);
  }
  animate();
}

function pagermemory_getSize(element){
  var rect = element.getBoundingClientRect();
  if(rect.width != 0 && rect.height != 0){
    return [rect.width, rect.height];
  } else {
    return [rect.right - rect.left, rect.bottom - rect.top];
  }
}
