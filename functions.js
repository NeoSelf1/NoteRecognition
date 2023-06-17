let VERTICAL=true;
let HORIZONTAL=false;
function remove_line(image){
    var staves;
    let top_pixel;
    let bot_pixel;
    let width = image.cols;
    let height= image.rows;
    staves= [];
    //세로 마디 선을 파악하기 위해 각 x좌표에서 검출되는 pixel 수를 row가 늘어감에 따라 누적시키고, 일정 길이를 넘어가면 이를 가리고, 해당 x좌표의 pixels 값 초기화
    const wordlineArr = Array.from(Array(width), () => Array(2).fill(0))
    var stdHeight = height*0.05
    for (let row = 0; row<height; row++){
      var pixels=0;
      if (staves.length==2 && stdHeight == height*0.05){
        stdHeight = 10*(staves[1][0]-staves[0][0])
      }
      for (let col = 0; col<width;col++){
        pixels += (image.ucharPtr(row,col)[0]==255)
        //같은 x좌표를 공유하는 2개의 하얀 점이 세로로 인접할때, 줄의 길이를 의미하는 wordlineArr[col][0]에 1을 더함
        if((image.ucharPtr(row,col)[0]==255||image.ucharPtr(row,col+1)[0]==255) && image.ucharPtr(row-1,col)[0]==255){
          wordlineArr[col][0]++;
          if(
            wordlineArr[col][0]>=stdHeight && //세로 선 길이가 stdHeight보다 더 길고,
            image.ucharPtr(row+1,col)[0]==0 && image.ucharPtr(row+1,col+1)[0]==0// 줄이 그 밑에서 끊길때(선의 끝에 도달할때)
            ){
            //선을 그린 후에
            cv.line(image, new cv.Point(col,wordlineArr[col][1]-stdHeight*0.2), new cv.Point(col,row+stdHeight*0.2), new cv.Scalar(0,0,0),3);
            wordlineArr[col][0]=0;//, 수치를 초기화
          }
        } else {
          //인접하지 않을때, 즉 줄이 끊기면 마디선이 아님으로 파악하고 다시 계산을 하기 위해 모든 수치 초기화
          wordlineArr[col][0]=0;//줄의 길이는 0으로
          wordlineArr[col][1]=row;//시작하는 y좌표는 현재 y좌표로
        }
      }
      /**가로선을 검출하기 직전에 가로선의 조건이 총족되는 지 확인하는 구문 
      (각 y좌표마다 같은 높이의 픽셀들 간, 하얀 픽셀들의 개수만큼 line을 그린다*/
      // cv.line(image, new cv.Point(0,row), new cv.Point(pixels,row), new cv.Scalar(125,255,255))
      
      /** 음표개수가 너무 많아서 가로선으로 착각하는 경우 발생, 따라서 0.5->0.7로 조정하였음*/
      if (pixels>=width*0.7){
        /**(이전에 탐색된 오선의 y좌표+높이) - 현재 탐색된 오선 y좌표 간의 차이가 0이면
        붙어있는 하나의 오선이기에 무효. 1보다 크면 새로운 오선으로 인식*/
        if (staves.length === 0 || Math.abs(staves.slice(-1)[0][0]+staves.slice(-1)[0][1]-row) > 1){
          staves.push([row, 0]);//오선의 y좌표, 오선높이
        } else {
          staves.slice(-1)[0][1] += 1;
          //끝에서 1번째부터 끝까지 => 끝항 하나
        }
      }
    }
    //cols = width, rows= height
    for (let staff=0; staff<staves.length;staff++){
      top_pixel=staves[staff][0];
      bot_pixel=staves[staff][0]+staves[staff][1]
      //가려주는 명령어 -> 만일 가리는 선이 음표를 중간에 가로지르거나 그러면, 가리는 것을 취소
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
    //for (let i =0; i<myStaves.length; i++){
       //cv.line(image,new cv.Point(0,myStaves[i]),new cv.Point(image.cols,myStaves[i]),new cv.Scalar(125,0,0))//Staves 위치 알려주는
      //  if (i%5==4){
        //이 네모는 단순히 마디 간의 사이를 가로질러 Object 객체가 지나치게 크게 검출되는 것을 막는 것.
        //cv.rectangle(image,new cv.Point(image.cols/2-300,(myStaves[i]+myStaves[i+1])/2-0.1),new cv.Point(image.cols,(myStaves[i]+myStaves[i+1])/2+0.1),new cv.Scalar(255, 0, 0),1,cv.LINE_AA,0)//가리는거
        // cv.rectangle(image,new cv.Point(0,(myStaves[i]+myStaves[i+1])/2-1.5),new cv.Point(image.cols,(myStaves[i]+myStaves[i+1])/2+1.5),new cv.Scalar(0, 0, 0),-1,cv.LINE_AA,0)//가리는거
      // }
    //}
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
    resized_gray.delete()
    return {resizedImg,myStaves}
}

function closing(image){
    let closed_image = new cv.Mat()
    let kernel = cv.Mat.ones(weighted(5),weighted(5),cv.CV_8U);
    cv.morphologyEx(image, closed_image, cv.MORPH_CLOSE, kernel)
    return closed_image
}

function weighted(value){
    //standard값이 변할때 코드가 정상작동되지 않음을 방지하고자 변수를 유동적으로 적용할 수 있는 함수 배치
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
      [y, x] = points[i];//y,x 순서임에 유의할 것! 
      //Threshold 과정에서 픽셀이 다 추출되지 않아, 줄기 형태가 온전치 않을 상황을 대비
      pixels += (image.ucharPtr(y,x-1)[0]==255 || image.ucharPtr(y,x)[0]==255 || image.ucharPtr(y,x+1)[0]==255);
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

function remove_noise(imgElement){
    let mat = cv.imread(imgElement);
    let mat_gray = new cv.Mat();
    let mat_thresh = new cv.Mat();
    cv.cvtColor(mat, mat_gray, cv.COLOR_BGR2GRAY, 0);
    cv.threshold(
      mat_gray, 
      mat_thresh,
      125,
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
        cv.rectangle(mask,new cv.Point(x1,y1),new cv.Point(x1+w,y1+h),new cv.Scalar(255, 255, 255),-1,cv.LINE_AA,0);
      }
    }
    let masked_img = new cv.Mat();
    cv.bitwise_and(mask,mask,masked_img,mat_thresh);
    mat.delete();
    mat_gray.delete();
    mat_thresh.delete();
    label.delete();
    stats.delete();
    centroids.delete();
    mask.delete();
    return masked_img
}

function object_detection(image,staves){
  let closing_image= closing(image)
  let label = new cv.Mat() // Label image (CV_32SC1 or CV_16UC1)
  let stats = new cv.Mat() // value and area value forming the bounding box
  let centroids = new cv.Mat() // centroid (x, y) (CV_64FC1)
  let nLabel = cv.connectedComponentsWithStats(closing_image,label,stats,centroids,4,cv.CV_32S)
  let lines = parseInt((staves.length)/5)//6 or 7
  const objects = [...new Array(lines)].map(() => []);
  //검출한 객체들의 stats를 objects 어레이에 추가 및 정렬하는 구문
  for (let i =0;i<nLabel;i++){
    const [x, y, w, h] = [
      stats.intAt(i, cv.CC_STAT_LEFT),
      stats.intAt(i, cv.CC_STAT_TOP),
      stats.intAt(i, cv.CC_STAT_WIDTH),
      stats.intAt(i, cv.CC_STAT_HEIGHT)
    ]
    //객체의 기초조건(크기)을 충족하였는가
    if (w < image.cols*0.5 && weighted(5) <= h && h < image.rows*0.5){ //if (w>=weighted(5)&&w<image.cols*0.5 && h>=weighted(5)&&h<image.rows*0.5){
      let objCenter= get_center(y,h);
      let dist=9999;
      let finalLine;
      //어디 line에 속해있는지 가려내는 for문
      for (let line=0; line<lines; line++){
        let area_center =(staves[line*5]+staves[(line+1)*5-1])/2;
        //오선 두칸 정도 더해진 범위 안에 center(y좌표)가 포함된다면, 해당 보표에 속해있는 객체이다.
        if(dist>Math.abs(objCenter-area_center)){
          dist=Math.abs(objCenter-area_center);
          finalLine=line;
        }
      }
      // cv.rectangle(image,new cv.Point(x,y),new cv.Point(x+w,y+h), new cv.Scalar(255, 255, 255), 1, cv.LINE_AA, 0);//Object 전체영역***
      put_text(image,finalLine,new cv.Point(x+w,y+h));
      objects[finalLine].push([x,y,w,h]);
    }
  }
  //같은 라인 중에서 좌 -> 우 순으로 정렬

  let noteHead_h=staves[2]-staves[0]; //음표머리의 높이
  for (let i =0; i<lines;i++){
    //
    //**** line별 상하단 끝을 계산하는 구문 위치
    // 별도의 배열 생성,
    objects[i].sort((a, b) => {
        return a[0] - b[0]
    })
    //조표를 찾는 과정 => 자리표의 일부분이 최좌단에 위치한 객체로 잘못 인식될 수 있으므로, 
    //일정 크기를 넘기는 조표가 나오기 전에 나오는 객체들은 모두 필터 요소로 판단
    let j =0;
    while(true){
      let [x,y,w,h] = objects[i][j]
      if ((noteHead_h<w)&&(noteHead_h*1.5<h)){
        //자리표 분류 명령어가 들어가야하는 장소
        objects[i]=objects[i].filter((_,id)=> (id>j));//조표로 인식된 개체보다 좌측에 있는 객체들은 추후 Recognition과정에서 제외
        //cv.rectangle(image,new cv.Point(x,y),new cv.Point(x+w,y+h), new cv.Scalar(125, 0, 0), 4, cv.LINE_AA, 0);//조표위치 표시
        break
      } else{
        j++;
      }
    }
  }

  //objects 구분없이 line별로 stems를 나열하는 새로운 자료구조 생성
  var stems=[];
  for (let i=0; i<objects.length;i++){
    var stemsPerLine = []
    for (let j=0; j<objects[i].length;j++){
      var stems_temp = stem_detection(image,objects[i][j],noteHead_h*1.6,noteHead_h)
      for (let k = 0; k < stems_temp.length; k++){
        stemsPerLine.push(stems_temp[k]);
      }
    }
    stems.push(stemsPerLine)
  }

  for (let i=0; i<stems.length;i++){//각 line마다 줄기들의 배열을 갖고 있기 때문에, line기준으로 1차 접근
    for (let j=0; j<stems[i].length; j++){// 같은 line에 소속되어있는 모든 줄기들 좌->우로 traverse 
      let [col,upperEnd,width,height]=stems[i][j];
      //꼬리가 시작되는 부분이 전체 객체 기준 조금 튀어나와있을 수 있음. 따라서 줄기 상하단 기준으로 여유공간이 추가된 높이만큼 탐색
      let spareSpace = parseInt(noteHead_h*0.5);
      for (let k = 0; k<height + 2*spareSpace;k++){
        if (image.ucharPtr(upperEnd - spareSpace + k,col+2)[0]==255){
          if (j!=stems[i].length-1){//객체 내에서 가장 우측에 위치한 줄기가 아니면, 꼬리 탐색을 위해 우측방향으로 traverse
            let tempX = col+2;
            let tempY = upperEnd-noteHead_h*0.5 + k;
            while(true){
              if (tempX >=stems[i][j+1][0]){//우측에 있는 줄기의 x좌표보다 커지면, 꼬리로 분류!
                cv.rectangle(image, new cv.Point(col, 2*(upperEnd-noteHead_h*0.5 + k)-tempY +noteHead_h*0.8),new cv.Point(tempX,tempY), new cv.Scalar(0, 0, 0), -1,cv.LINE_AA,0);//연결꼬리 가리는 용도
                break;
              } else {//우측의 줄기까지 아직 도달하지 못한 상황 => 연결된 꼬리가 아닌 단일 꼬리, 음표이거나 or 아직 계산중이거나
                if(image.ucharPtr(tempY-1, tempX+1)[0]==255){
                  tempX++;
                  tempY--;
                } else if (image.ucharPtr(tempY+1, tempX+1)[0]==255){
                  tempX++
                  tempY++
                } else {//우측에 더이상 인접한 하얀픽셀이 없음 -> while문 탈출
                  break
                }
              }
            }
          }
        }
      }
      cv.line(image, new cv.Point(col,upperEnd), new cv.Point(col,upperEnd+height), new cv.Scalar(125,0,0),2);//줄기위치 표시
    }
  }
  //objects 내에 stems를 넣을 수도 있었으나, objects 내에 stems를 넣게 되면, 3중 for문으로 접근이 필요.
  //결국 최종적으로 objects에 들어가야할 정보는 계이름 음정인 만큼, 음정을 추출하기위한 재료인 줄기정보는 일단 stems 배열에 저장
  //stems 배열의 경우, 줄기기준으로 나뉘어져 있는 만큼, line과 objects의 구분이 필요없어  접근이 가능할 것이고, 
  return [image,stems,noteHead_h]
}
  //column = x, row = y
function stem_detection(image,stats,length,noteHead_h){
  const [x, y, w, h] = stats
  const stems=[]
  //너비만큼 x좌표를 traverse
  for (let col=x; col<x+w; col++){
    //각 음표의 최좌단 최우단 x좌표를 모두 훑어보며 get_line을 통해 음표의 특징이 되는 기둥의 유무를 파악한다
    const [end,pixels]=get_line(image,VERTICAL,col,y,y+h,length) //image, axis, axisValue, start, end, length
    //col==axis_value,해당 x좌표를 계속 바꾸며 전체 음표의 최하단-최상단 사이에 length
    //(선의 최소 길이 조건)이상의 선이 있는지 확인
    if (pixels>0){ //이전 기둥과 바로 붙어있지 않고 (이전 기둥의 x좌표+너비와 현재 기둥 x좌표 간의 차이가 0일때), 처음으로 나온 줄기일때.
      if (stems.length==0 || Math.abs(stems.slice(-1)[0][0] + stems.slice(-1)[0][2]-col)>=1){
        //음표가 밀접되어있는 구간을 줄기로 잘못 인식하는 문제 해결
        if (stems.length!=0 && col-stems[stems.length-1][0]<noteHead_h*0.7){ //stems리스트 바로 전 요소와의 x좌표 거리가 머리 너비보다 좁으면
          if (stems[stems.length-1][3] < pixels){ //우측(더 최근에 검출된) 줄기가 더 길면
            stems[stems.length-1] = [col,end-pixels,1,pixels]; //기존에 기록한 줄기 기록 대체
          }
        } else{
          stems.push([col,end-pixels,1,pixels])//(x좌표, 상단끝,너비, 길이)
        }
      } else {
        stems.slice(-1)[0][2]++ //이전 기둥의 너비를 단순히 넓힘
      }
    }
  }
  return stems  //stems 배열에 각 객체 내에서 검출된 stem들을 모두 저장한 후 반환. 줄기가 없는 객체의 경우 [] 반환
}

function recognition0616(image,stems,headH_2,staves){//head_h = 계이름머리 높이 * 2
  let headH= parseInt(headH_2*0.5)-1 ;
  let headW= parseInt(headH*1.2)+2;
  var isHead=0;
  let pxRange =2;

  let pitches=[];

  for (let i = 0; i < stems.length; i++){//i = line을 의미
    let pitchesPerLine=[];
    for (let j = 0; j < stems[i].length; j++){
      let pitchesPerStem=[];
      let staff = staves.slice(i * 5, (i+ 1) * 5);
      //현재 object가 소속되어있는 line ex.1 => 5,10 => 5,6,7,8,9
      let [col, upperEnd, width, height]=stems[i][j];
      //좌측으로 인접한 계이름 머리 추출
      for(let k =0; k<height+headH*2; k++){//줄기의 상하단 양쪽에서 headH 여백을 두고 추가로 traverse하게끔 for문, if문의 범위 설정
        var presentY = upperEnd-headH+k
        if (
          image.ucharPtr(presentY,col- headW*0.5)[0]==255 &&
          count_rect_pixels(image,[col-headW,presentY,headW,headH]) >=55 &&
          (image.ucharPtr(presentY+headH*0.5-pxRange,col- headW)[0]==255 ||  // *
            image.ucharPtr(presentY+headH*0.5,col- headW+pxRange)[0]==255 ||  //   *
            image.ucharPtr(presentY+headH*0.5+pxRange,col- headW)[0]==255) && // *

          (image.ucharPtr(presentY+headH*0.5-pxRange,col-2)[0]==255 ||  //            *
            image.ucharPtr(presentY+headH*0.5,col-2-pxRange)[0]==255   ||//          *
            image.ucharPtr(presentY+headH*0.5+pxRange,col-2)[0]==255) && //            *

          (image.ucharPtr(presentY+headH,col-headW*0.5-pxRange)[0]==255 ||   //            
            image.ucharPtr(presentY+headH,col-headW*0.5+pxRange)[0]==255  ||  //          *
            image.ucharPtr(presentY+headH-pxRange,col-headW*0.5)[0]==255) &&  //       *     *
            isHead ==0){
            // cv.rectangle(image,new cv.Point(col-headW,presentY),new cv.Point(col,presentY+headH),new cv.Scalar(125,0,0),1,cv.LINE_AA,0)//좌측머리경계***
            pitchesPerStem.push(recognize_pitch(image, staff, presentY+headH*0.5))
            isHead=headH;
        } 
        image.ucharPtr(presentY,col- headW*0.5)[0]=125;//계이름머리의 중앙 x좌표 표시
        if (isHead>0){
          isHead--;
        }
      }

      //우측으로 인접한 계이름 머리 추출
      isHead=0;        
      for(let k =0; k<height+headH*2; k++){
        var presentY = upperEnd-headH+k
          if (
            image.ucharPtr(presentY,col+ headW*0.5)[0]==255 &&
            count_rect_pixels(image,[col,presentY,headW,headH]) >=55 &&
            (image.ucharPtr(presentY+headH*0.5-pxRange,col)[0]==255 ||       // *
             image.ucharPtr(presentY+headH*0.5,col + pxRange)[0]==255 ||     //   *
             image.ucharPtr(presentY+headH*0.5+pxRange,col)[0]==255) &&      // *

            (image.ucharPtr(presentY+headH*0.5-pxRange,col+headW-2)[0]==255 ||  //            *
             image.ucharPtr(presentY+headH*0.5,col+headW-2-pxRange)[0]==255   ||//          *
             image.ucharPtr(presentY+headH*0.5+pxRange,col+headW-2)[0]==255) && //            *

            (image.ucharPtr(presentY+headH,col+headW*0.5-pxRange)[0]==255 ||   //            
             image.ucharPtr(presentY+headH,col+headW*0.5+pxRange)[0]==255   || //          *
             image.ucharPtr(presentY+headH-pxRange,col+headW*0.5)[0]==255) &&  //       *     *
             isHead ==0){
              // cv.rectangle(image,new cv.Point(col,presentY),new cv.Point(col+headW,presentY+headH),new cv.Scalar(125,0,0),1,cv.LINE_AA,0)//우측머리경계***
              pitchesPerStem.push(recognize_pitch(image, staff, presentY+headH*0.5))
              isHead=headH-1;
          } 
          // image.ucharPtr(presentY,col- headW*0.5)[0]=125;//머리 중앙 x좌표를 가로지르는 회색선
          if (isHead>0){
            isHead--;
          }
      }
      //줄기당 계이름머리가 존재할 경우에만, line당 계이름 배열에 추가
      if(pitchesPerStem.length!=0){
        pitchesPerLine.push([col,pitchesPerStem]);
      }
    }
    pitches.push(pitchesPerLine)
  }
  console.log(pitches)
  return [image]
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

function recognize_pitch(image,staff,head_center){
  let pitch_lines= Array.from({length:21},(_,i)=> [staff[4]+weighted(30)-weighted(5)*i])
  let distance=image.cols;
  let finalI;
  for (let i =0; i<pitch_lines.length; i++){
    let line= pitch_lines[i];
    // cv.rectangle(image, new cv.Point(10,parseInt(line)),new cv.Point(image.cols,parseInt(line)), new cv.Scalar(255, 255, 255), 0.5,cv.LINE_AA,0)//neo2
    //line 높이도 적절하게 측정되었음
    //각 오선 라인의 y좌표값
    let newDist= Math.abs(line-head_center);
    if (newDist<distance){
      finalI=i;
      distance=newDist;
    }
  }
  return finalI
}