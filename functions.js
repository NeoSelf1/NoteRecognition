
let VERTICAL=true;
let HORIZONTAL=false;
function remove_line(image){
    var staves;
    let top_pixel;
    let bot_pixel;
    let width = image.cols;
    let height= image.rows;
    staves= [];
    for (let row =0; row<height; row++){
      var pixels=0;
      for (let col = 0; col<width;col++){
        pixels += (image.ucharPtr(row,col)[0]==255)
      }
      if (pixels>=width*0.5){
        //(이전에 탐색된 오선의 y좌표+높이) - 현재 탐색된 오선 y좌표 간의 차이가 0이면
        //붙어있는 하나의 오선이기에 무효. 1보다 크면 새로운 오선으로 인식
        if (staves.length === 0 || Math.abs(staves.slice(-1)[0][0] + staves.slice(-1)[0][1] - row) > 1) {
          staves.push([row, 0]);//오선의 y좌표, 오선높이
          
        } else {
          //**slice를 사용했을때, 첫번째 인자는 무엇을 의미하는지?? 이해가 되지 않습니다.
          staves.slice(-1)[0][1] += 1;
          //끝에서 1번째부터 끝까지 => 끝항 하나
        }
      }
    }
    //cols = width, rows= height
    for (let staff=0; staff<staves.length;staff++){
      top_pixel=staves[staff][0];
      bot_pixel=staves[staff][0]+staves[staff][1]
      for (let col=0; col<width;col++){
        if (image.ucharPtr(top_pixel-1,col)[0]==0 && image.ucharPtr(bot_pixel+1,col)[0]==0){
          for (let row=top_pixel;row<bot_pixel+1;row++){
            image.ucharPtr(row,col)[0]=0;
            image.ucharPtr(row,col)[1]=0;
            image.ucharPtr(row,col)[2]=0;
          }
        }
      }
    }
    let myStaves=staves.map((arr)=> arr[0])
    for (let i =0; i<myStaves.length; i++){
      if (i%5==4){
        cv.rectangle(image,new cv.Point(0,(myStaves[i]+myStaves[i+1])/2-1),new cv.Point(image.cols,(myStaves[i]+myStaves[i+1])/2+1),new cv.Scalar(0, 0, 0),-1,cv.LINE_AA,0)//가리는거

      }
    }
    // console.log(myStaves)
    return {image,myStaves}
}

function normalization(image,staves,standard){
    let avg_dist = 0
    lines= parseInt(staves.length /5)
    for (let line=0;line<lines;line++){
      for (let staff=0;staff<4;staff++){
        let staff_above = staves[line*5+staff]
        let staff_below = staves[line * 5 + staff + 1]
        avg_dist +=Math.abs(staff_above-staff_below)
      }
    }
    avg_dist/=staves.length - lines
    let weight = standard/avg_dist
    const resized= new cv.Mat()
    const resized_gray= new cv.Mat()
    const resizedImg= new cv.Mat()
    let newWidth= parseInt(image.cols* weight)
    let newHeight= parseInt(image.rows* weight)
    cv.resize(image,resized,new cv.Size(newWidth,newHeight));
    cv.cvtColor(resized, resized_gray, cv.COLOR_BGR2GRAY, 0);
    cv.threshold(
      resized_gray, 
      resizedImg,
      127,
      255,
      cv.THRESH_BINARY | cv.THRESH_OTSU
    );
    let myStaves=staves.map((item)=>item*weight)
    resized.delete()
    return {resizedImg,myStaves}
    resizedImg.delete()
}

function closing(image){
    let closed_image = new cv.Mat()
    let kernel = cv.Mat.ones(weighted(5),weighted(5),cv.CV_8U);
    cv.morphologyEx(image, closed_image, cv.MORPH_CLOSE, kernel)
    return closed_image
}

function weighted(value){
    //standard값이 변할때 코드가 정상작동되지 않음을 방지하고자 
    //변수를 유동적으로 적용할 수 있는 함수 배치
    standard=10
    return parseInt(value*(standard/10))
}

function put_text(image,text,loc){
    cv.putText(image,String(text), loc, 1, 1, [255, 0, 0,255]);
}

function get_center(y,h){
    return (y+y+h)/2
}
  
function get_line(image, axis, axisValue, start, end, length) {
    let points, pixels = 0;
    var x,y;
    if (axis==true) {
      points = Array.from({length: end - start}, (_, i) => [i + start, axisValue]);
    } else {
      points = Array.from({length: end - start}, (_, i) => [axisValue, i + start]);
    }
    for (let i = 0; i < points.length; i++) {
      [y, x] = points[i]; //이 배치 옳다
      pixels += (image.ucharPtr(y,x)[0]==255 || image.ucharPtr(y,x-1)[0]==255 || image.ucharPtr(y,x+1)[0]==255);//문제의 코드
      const nextPoint = axis ? [(image.ucharPtr(y + 1,x)[0]),(image.ucharPtr(y + 1,x-1)[0])] : (image.ucharPtr(y,x+1));

      if ((nextPoint[0] == 0 && nextPoint[1] == 0 ) || i == points.length - 1) {//line의 두께가 일정수치를 넘어가면 line이 아니라고 인식
        if (pixels >= weighted(length)) {
          break;
        } else {
          pixels = 0;
        }
      }
    }
    return axis ? [y, pixels] : [x, pixels];
}

function count_rect_pixels(image, rect) {
    let [x, y, w, h] = rect;
    let pixels = 0;
    for (let row = y; row < y + h; row++) {
        for (let col = x; col < x + w; col++) {
        if (image.ucharPtr(row,col)[0] == 255) {
            pixels += 1;
        }
        }
    }
    return pixels;
} 

function remove_noise(imgElement){
    let mat = cv.imread(imgElement);
    let mat_gray = new cv.Mat();
    let mat_thresh = new cv.Mat();
    cv.cvtColor(mat, mat_gray, cv.COLOR_BGR2GRAY, 0);
    cv.threshold(
      mat_gray, 
      mat_thresh,
      127,
      255,
      cv.THRESH_BINARY_INV | cv.THRESH_OTSU
    );
    let label = new cv.Mat() // Label image (CV_32SC1 or CV_16UC1)
    let stats = new cv.Mat() // value and area value forming the bounding box
    let centroids = new cv.Mat() // centroid (x, y) (CV_64FC1)
    let nLabel = cv.connectedComponentsWithStats(
      mat_thresh,
      label,
      stats,
      centroids,
      4,
      cv.CV_32S
    )
    let mask =cv.Mat.zeros(mat.rows, mat.cols, cv.CV_8UC3);
    for (let row =1; row<nLabel; row+=1){
      const [x1, y1, w, h] = [
        stats.intAt(row, cv.CC_STAT_LEFT),
        stats.intAt(row, cv.CC_STAT_TOP),
        stats.intAt(row, cv.CC_STAT_WIDTH),
        stats.intAt(row, cv.CC_STAT_HEIGHT)
      ]
      if (mat_thresh.size().height*0.8>h && w>mat_thresh.size().width*0.5){
        cv.rectangle(mask,new cv.Point(x1,y1),new cv.Point(x1+w,y1+h),new cv.Scalar(255, 255, 255),-1,cv.LINE_AA,0)
      }
    }
    let masked_img = new cv.Mat();
    cv.bitwise_and(mask,mask,masked_img,mat_thresh)
    mat.delete();
    mat_gray.delete();
    mat_thresh.delete();
    label.delete();
    stats.delete();
    centroids.delete();
    mask.delete();
    return masked_img
}
// function recognize_note_tail(image,index,stem,direction){
//   let [x,y,w,h]=stem
//   if (direction=="true"){

//   }
// }

function stem_detection(image,stats,length){
    const [x, y, w, h, area] = stats
    const stems=[]
    //column = x, row = y
  //반복횟수 = w만큼 실행됨 -> 13 , 8 ,18 , 8 ...

    for (let col=x; col<x+w; col++){
      //각 음표의 최좌단 최우단 x좌표를 모두 훑어보며 get_line을 통해 음표의 특징이 되는 기둥의 유무를 파악한다
      const [end,pixels]=get_line(image,VERTICAL,col,y,y+h,length)
      //image, axis, axisValue, start, end, length
      //문제는 get_line!에서 pixels!=0 횟수가 적게 검출

      //col==axis_value,해당 x좌표를 계속 바꾸며 전체 음표의 최하단-최상단 사이에 length
      //(선의 최소 길이 조건)이상의 선이 있는지 확인
      if (pixels>0){
        if (stems.length==0 || Math.abs(stems.slice(-1)[0][0] + stems.slice(-1)[0][2]-col)>=1){
          stems.push([col,end-pixels+1,1,pixels])//(x, y, w, h)
        } else {
          //이전 기둥과 바로 붙어있는 (이전 기둥의 x좌표+너비와 현재 기둥 x좌표 간의 차이가 0일때)
          //경우, 이전 기둥의 너비를 단순히 넓히는 것으로 마무리
          stems.slice(-1)[0][2]++
        }
      }
    }
    return stems
}

function object_detection(image,staves){
    let closing_image= closing(image)
    let label = new cv.Mat() // Label image (CV_32SC1 or CV_16UC1)
    let stats = new cv.Mat() // value and area value forming the bounding box
    let centroids = new cv.Mat() // centroid (x, y) (CV_64FC1)
    let nLabel = cv.connectedComponentsWithStats(
      closing_image,
      label,
      stats,
      centroids,
      4,
      cv.CV_32S
    )
    let lines = parseInt((staves.length)/5)
    let objects= []
    for (let i =0;i<nLabel;i++){
      const [x1, y1, w, h,area] = [
        stats.intAt(i, cv.CC_STAT_LEFT),
        stats.intAt(i, cv.CC_STAT_TOP),
        stats.intAt(i, cv.CC_STAT_WIDTH),
        stats.intAt(i, cv.CC_STAT_HEIGHT),
        stats.intAt(i, cv.CC_STAT_AREA)
      ]
      if (w>=weighted(5)&&w<image.cols*0.5 && h>=weighted(5)&&h<image.rows*0.5){
        let center= get_center(y1,h)
        //어디 line에 속해있는지 가려내는 for문
        for (let line=0; line<lines; line++){
          let area_top = staves[line*5]-weighted(20)
          let area_bot = staves[(line+1)*5-1]+weighted(20)
          //여기가 모든 문제의 원인!
          //오선 두칸 정도 더해진 범위 안에 center(y좌표)가 포함된다면, 해당 보표에 속해있는 객체이다.
          if (area_top<=center && center<=area_bot){//여기가 문제!
            let stats = [x1,y1,w,h,area]
            let stems= stem_detection(image,stats,30)
            let direction='none';
            if (stems.length>0){
              if (stems[0][0]-stats[0] >= weighted(5)){
                direction='true'
              } else {
                direction='false'
              }
            }
            objects.push([line,[x1,y1,w,h,area],stems,direction])
            // cv.rectangle(image,new cv.Point(x1,y1),new cv.Point(x1+w,y1+h),new cv.Scalar(255, 255, 255),1,cv.LINE_AA,0)//전체영역***

          }
        }
      }
    }
    objects.sort()
    return [image,objects]
}

function recognition(image, staves, objects) {
  let finalPitches = [];
  let objectsMask=[]
  let object_2=[]
  let object_3=[]
  let maxLine=0
  for (let i = 1; i < objects.length; i++) {
    let obj = objects[i];
    let line = obj[0];
    if (line>maxLine){
      maxLine=line
    }
    let stats = obj[1];
    let stems = obj[2];
    let direction = obj[3];
    let [x, y, w, h, area] = stats;
    let staff = staves.slice(line * 5, (line + 1) * 5);
    const pitch = recognize_note(image, staff, stats, stems, direction,objects);
    if (pitch.length>0){
      for (let j =0; j<pitch.length;j++){
        object_2.push([objects[i][objects[i].length-4],pitch[j]])
      } 
    }
    //255=길이, stem별로 끊었기에.
  }
  for (let i=0; i<maxLine+1; i++){
    let tempForSort=[]
    for (let j=0;j<object_2.length;j++){
      if (object_2[j][0]==i){//줄기로 연결되어있는 다수의 음표머리의 경우에는, 밀려서 line변수가 기준이 되지 않음
        tempForSort.push(object_2[j])//****
      }
    }
    // console.log(tempForSort)
    tempForSort.sort(function(a,b){
      if (a[1][1]>b[1][1]){
        return 1;
      }
      if (a[1][1]<b[1][1]){
        return -1;
      }
      return 0
    })
    object_3.push(tempForSort)
  }
  for (let i=0;i<object_3.length;i++){
    for(let j=0;j<object_3[i].length;j++){
      put_text(image,object_3[i][j][1][0],new cv.Point(object_3[i][j][1][1],staves[object_3[i][j][0]*5+4]+weighted(60)))
    }
  }
  return [image, object_3];
}

function recognize_pitch(image,staff,head_center){
  let pitch_lines= Array.from({length:21},(_,i)=> [staff[4]+weighted(30)-weighted(5)*i])
  let distance=image.cols;
  let finalI;
  for (let i =0; i<pitch_lines.length; i++){
    let line= pitch_lines[i]
    // cv.rectangle(image, new cv.Point(10,parseInt(line)),new cv.Point(image.cols,parseInt(line)), new cv.Scalar(255, 255, 255), 0.5,cv.LINE_AA,0)//neo2
    //line 높이도 적절하게 측정되었음
    //각 오선 라인의 y좌표값
    let newDist= Math.abs(line-head_center)
    if (newDist<distance){
      finalI=i
      distance=newDist
    }
  }
  return finalI
}
function recognize_note(image, staff, stats, stems, direction,objects) {
  let [x, y, w, h, area] = stats;
  let noteX = []
  let pitches = []
  //줄기가 존재하는 대상에 한해 recognize_note_head가 실해됨. 온음표는 애초에 인식하기 용이한 구조
  //note condition
  if (stems.length>=1 && image.rows*0.5>=w && w>=weighted(10) && h >= weighted(35) && area >= weighted(95)) {
    for (let i=0; i<stems.length; i++){
      let pitches_temp=[]
      let stem = stems[i]
      const [head_exist, head_fill, head_centers]=recognize_note_head(image, stem, direction,objects)
      if(head_centers.length>0){
        for (let i =0; i<head_centers.length;i++){
          pitches_temp.push(recognize_pitch(image,staff,head_centers[i]))
        }
      }
      pitches.push([pitches_temp,stem[0]])
      // put_text(image,pitches_temp,new cv.Point(stem[0]-weighted(10),y+h+weighted(50)))
    }
    //온음표
  } else if (weighted(24)>= w && w>=weighted(13) && weighted(13)>= h && h>=weighted(10)) {
    let head_center = y+(h/2)
    let pitch = recognize_pitch(image,staff,head_center)
    pitches.push([pitch,x+(w/2)-weighted(10)])
    put_text(image,direction,new cv.Point(x+(w/2)-weighted(10),y+h+weighted(50)))
    // cv.rectangle(image,new cv.Point(x,y),new cv.Point(x+w,y+h),new cv.Scalar(255, 255, 255),1,cv.LINE_AA,0)//neo1-headCenter
  }
  cv.rectangle(image,new cv.Point(x,y),new cv.Point(x+w,y+h),new cv.Scalar(255, 255, 255),1,cv.LINE_AA,0)//neo-영역전체        

  return pitches
}

function recognize_note_head(image, stem, direction,objects) {
  let [x_stem, y_stem, w_stem, h_stem] = stem;
  let area_top, area_bot, area_left, area_right=0
  let noteHalf=weighted(5)
  //현재 area_top, bot 등등의 영역 지정은 음표가 단일일때에만 해당되는 구문
  let topPixelsHeight_l,topPixelsHeight_r,fullCnt_l,fullCnt_r=0
  let temp_list=[]
  let head_centers=[]
  if (direction=='true') {
    for (let i =0; i<h_stem-weighted(12);i++){
      if (image.ucharPtr(y_stem+i+weighted(12),x_stem-noteHalf)[0]==255){
        //처음으로 유의미한 덩어리가 포착된 높이(위->아래)기록
          area_left = x_stem - noteHalf*2;
          area_right = x_stem;
        if (fullCnt_l==0){
          topPixelsHeight_l=y_stem+i+weighted(12)-1
        }
        if(fullCnt_l>=noteHalf){
          area_top=topPixelsHeight_l
          area_bot=area_top+noteHalf*2
          temp_list.push((area_top+area_bot)/2)
          cv.rectangle(image,new cv.Point(area_left,area_top),new cv.Point(area_right,area_bot),new cv.Scalar(125,0,0),1,cv.LINE_AA,0)//neo-가상선
          fullCnt_l=0
        }
        fullCnt_l++
      } else {
        fullCnt_l=0
      }
      if (image.ucharPtr(y_stem+i+noteHalf*4,x_stem+noteHalf)[0]==255){
        area_left = x_stem;
        area_right = x_stem+noteHalf*2;
        if (fullCnt_r==0){
          topPixelsHeight_r=y_stem+i-1+noteHalf*4
        }
        if(fullCnt_r>=noteHalf){
          area_top=topPixelsHeight_r
          area_bot = area_top+noteHalf*2;
          temp_list.push((area_top+area_bot)/2)
          cv.rectangle(image,new cv.Point(area_left,area_top),new cv.Point(area_right,area_bot),new cv.Scalar(125,0,0),1,cv.LINE_AA,0)//neo-가상선
          fullCnt_r=0
        }
        fullCnt_r++
      } else {
        fullCnt_r=0
      }
    }
  }else{
    for (let i =-weighted(12); i<h_stem-weighted(12);i++){
      if (image.ucharPtr(y_stem+i,x_stem-noteHalf)[0]==255){
        //처음으로 유의미한 덩어리가 포착된 높이(위->아래)기록
          area_left = x_stem - noteHalf*2;
          area_right = x_stem;
        if (fullCnt_l==0){
          topPixelsHeight_l=y_stem+i-1
        }
        if(fullCnt_l>=noteHalf){
          area_top=topPixelsHeight_l
          area_bot=area_top+noteHalf*2                
          temp_list.push((area_top+area_bot)/2)
          cv.rectangle(image,new cv.Point(area_left,area_top),new cv.Point(area_right,area_bot),new cv.Scalar(125,0,0),1,cv.LINE_AA,0)//neo-가상선
          fullCnt_l=0
        }
        
        fullCnt_l++
      } else {
        fullCnt_l=0
      }
      if (image.ucharPtr(y_stem+i,x_stem+noteHalf)[0]==255){
        area_left = x_stem;
        area_right = x_stem+noteHalf*2;
        if (fullCnt_r==0){
          topPixelsHeight_r=y_stem+i-1
        }
        if(fullCnt_r>=noteHalf){
          area_top=topPixelsHeight_r
          area_bot = area_top+noteHalf*2;
          temp_list.push((area_top+area_bot)/2)
          cv.rectangle(image,new cv.Point(area_left,area_top),new cv.Point(area_right,area_bot),new cv.Scalar(125,0,0),1,cv.LINE_AA,0)//neo-가상선
          fullCnt_r=0
        }
        fullCnt_r++
      } else {
        fullCnt_r=0
      }
    }
  }
  
  if (temp_list.length>0){
    temp_list.sort()
    head_centers = temp_list.filter((element,index)=> {return temp_list.indexOf(element)===index})
    //여기까지 head_centers 정상추출됨
  }
  let cnt =0;
  let cnt_max = 0
  let pixel_cnt = count_rect_pixels(image,[area_left,area_top,area_right-area_left,area_bot-area_top])
  // count_rect_pixels(image, [x, y, w, h]
  for (let row=area_top; row<area_bot;row++){
    const [end, pixels] = get_line(image,HORIZONTAL,row,area_left,area_right,5)
    
    if (pixels+1>weighted(5)){
      cnt++
      cnt_max= Math.max(cnt_max,pixels)
      // head_center +=row
    }
  }
  cv.rectangle(image,new cv.Point(x_stem,y_stem-noteHalf),new cv.Point(x_stem,y_stem+h_stem+noteHalf),new cv.Scalar(255, 255, 255),1,cv.LINE_AA,0)//neo-줄기위치
  //줄기의 최하단 좌표를 기준, 계이름들을 분리하는 가상선을 그려준 후에, recognize_notehead를 변형하여 다수의 음표 pitch를 fetch
  let head_exist = (cnt>=4 && pixel_cnt>=55)
  let head_fill = (cnt>= 9 && cnt_max>=10 && pixel_cnt>=90)
  return [head_exist, head_fill, head_centers]
}
