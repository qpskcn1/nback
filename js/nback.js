


function nback(){
    this.count_nback = 2; //Number n in n-back
    this.count_trial = 22;
    this.speed = 2500; //milisecond to answer
    this.square_duration = 1000; //How long a square is showed before disappearing
    this.answer_delay = 500; //Do not allow answering when playing new sound, this should be the length of the sound file .wav
    this.current_trial = -1; //Current trial when playing, starting from 0

    this.arr_pos = new Array(); //Array of random square position (1-9)
    this.arr_letter = new Array(); //Array of random letter

    this.arr_audio = new Object(); //Array of buffered audio
    this.arr_chosen_letters = ['c','h','k','l','q','r','s','t'];
    this.answer_allowed = false; //Whether user can press A/L to answer
    this.show_indicator = true; //Whether the program show correct/incorrect indicator for each trial

    this.pressed_a = false; //Flag to know if A is pressed once
    this.pressed_l = false; //Flag to know if L is pressed once

    this.score = 0; //Total score for each session
    this.count_game = 0; //Total game played

    this.lock_timestamp = true;
    this.pre_timestamp = new Date();
    this.arr_timestamp = [];
    this.score_per = 0;

    this.id_MTIDorUser = "null";
    this.id_MTIDorUser = getQueryVariable("userID");

    this.getID = function(){

    }
    this.refreshLog = function(){
      this.lock_timestamp = true;
      this.arr_timestamp = [];
      this.score_per = 0;
    }
    this.sendResult = function() {

        var user = firebase.auth().currentUser;
        var dbRef = firebase.database().ref('users/'+this.id_MTIDorUser+'/'+ new Date());

        data = {"uid":user.uid,"time":this.arr_timestamp,"accuracy":this.score_per};
        dbRef.update(data);
        console.log("Sent data to database: " + data);
    }

    this.get_timedelta = function(){
      if (!this.lock_timestamp) {
        delta = new Date() - this.pre_timestamp
        this.arr_timestamp.push(delta);
        this.lock_timestamp = true;
        return delta;
      }
    }

    this.set_timestamp = function (){
      this.pre_timestamp = new Date();
      this.lock_timestamp = false;
    }

    /**
    * Load all audio(.wav) files into Audio objects
    */
    this.buffer_audio = function (){
        var i;
        var letter;
        for (i = 0; i < this.arr_chosen_letters.length; i++){
            letter = this.arr_chosen_letters[i];
            letter_path = 'letters/' + letter + '.wav';
            this.arr_audio[letter] = new Audio(letter_path);
        }
    };
    this.buffer_audio();

    /**
    * Initialzie the arrays for next game
    */
    this.init_game = function (){
        this.refreshLog();
        var i;
        var random_letter, random_pos;
        this.current_trial = -1;
        this.score = 0;
        for (i=0; i< this.count_trial; i++){
            //Get random letter from the chosen letters
            random_letter = this.arr_chosen_letters[random_int(0, this.arr_chosen_letters.length-1)];
            //Generate random int number [1,9]
            random_pos = random_int(1,9);
            this.arr_pos[i] = random_pos;
            this.arr_letter[i] = random_letter;
            //Control the chance of n-back, that is the chance that pos/letter appear the same as previous n-trial
            if (i >= this.count_nback && random_int(1,8) == 1){
                this.arr_pos[i] = this.arr_pos[i-this.count_nback];
            }
            if (i >= this.count_nback && random_int(1,8) == 1){
                this.arr_letter[i] = this.arr_letter[i-this.count_nback];
            }
        }

    };

    /**
    * Start a new game
    */
    this.start_game = function (){
        this.init_game();
        this.show_next_trial();
        $("#pressSpace").html('');
    };

    /**
    * Show square and play sound for next trial
    */
    this.show_next_trial = function(){
        if (this.current_trial < this.count_trial - 1){
            this.calculate_score();
            this.answer_allowed = false;
            this.reset_color();
            this.current_trial++;
            var current_trial = this.current_trial;
            var current_pos = this.arr_pos[current_trial];
            var current_letter = this.arr_letter[current_trial];
            //Play sound and show square
            this.play_sound(current_letter);
            this.draw_square(current_pos);
            //Hide square after one second
            var nb = this;
            setTimeout(function(){
                nb.hide_square(current_pos);
            },this.square_duration);

            //Show next trial
            setTimeout(function(){
                nb.show_next_trial();
            },this.speed);

            //Allow answering after a quick delay
            setTimeout(function(){
                nb.answer_allowed = true;
                nb.set_timestamp();
            },this.answer_delay);
        }
        else {
            //End one session
            this.calculate_score();
            this.reset_color();
            this.answer_allowed = false;
            this.current_trial = -1;
            this.count_game++;
            this.add_scoreboard();
            this.sendResult();
            console.log(this.arr_timestamp);
            alert(this.arr_timestamp);
            $("#pressSpace").html('Press SPACE to start a new session');
        }

    };

    /**
    * Add current score to the scoreboard
    */
    this.add_scoreboard = function(){
        var total_score = (this.count_trial - this.count_nback)*2;
        var score_percent = Math.floor((this.score / total_score) * 100);
        this.score_per = score_percent;
        var new_li = $("<li>").html("Session "+ this.count_game +" => " + score_percent + "%");
        $("#scoreList").append(new_li);
        console.debug($("#scoreList").length);
    };

    /**
    * Calculate score after each trial
    */
    this.calculate_score = function(){
        if (this.current_trial - this.count_nback >= 0){
            if (this.pressed_a && this.is_pos_thesame()){
                //Pressed A correctly
                this.score++;
            } else if (!this.pressed_a && !this.is_pos_thesame()){
                //Skipped A correctly
                this.score++;
            }
            if (this.pressed_l && this.is_letter_thesame()){
                //Pressed L correctly
                this.score++;
            } else if (!this.pressed_l && !this.is_letter_thesame()){
                //Skipped L correctly
                this.score++;
            }
        }
        console.debug('zdb score=' + this.score);
    }

    /**
    * Draw the square
    */
    this.draw_square = function (pos){
        var canvas = $("#gameCanvas");
        var margin = 18;
        var square_width = Math.floor(canvas.width()/3 - margin*2);
        var ctx = canvas[0].getContext("2d");
        var img = $("#imgSquare");
        //Calculate position based on pos number 1 - 9
        var ypos = Math.floor((pos - 1)/3) * (square_width + 2*margin);
        var xpos = ((pos-1) % 3) * (square_width + 2*margin);
        ctx.drawImage(img[0], xpos + margin, ypos + margin, square_width, square_width);
    };

    /**
    * Hide the square at input position
    */
    this.hide_square = function (pos){
        var canvas = $("#gameCanvas");
        var margin = 10;
        var square_width = Math.floor(canvas.width()/3 - margin*2);
        var ctx = canvas[0].getContext("2d");
        var ypos = Math.floor((pos - 1)/3) * (square_width + 2*margin);
        var xpos = ((pos-1) % 3) * (square_width + 2*margin);
        ctx.clearRect(xpos + margin, ypos + margin,square_width,square_width);
    };

    /**
    * Play sound based on input letter(ch)
    */
    this.play_sound = function (letter){
        this.arr_audio[letter].play();
    };

    /**
    * Draw blank background
    */
    this.draw_background = function (){
        var canvas = $("#gameCanvas");
        var line_width = 1;
        var space_width = Math.floor((canvas.width() - 2 * line_width)/3);
        var ctx = $(canvas)[0].getContext('2d');
        //ctx.fillStyle = "rgb(0,0,0)";
        //ctx.fillRect(space_width, 0, line_width, canvas.height());
        ctx.lineWidth = line_width;
        ctx.beginPath();
        //Vertical lines
        ctx.moveTo(space_width, 0);
        ctx.lineTo(space_width, canvas.height());
        ctx.moveTo(space_width*2, 0);
        ctx.lineTo(space_width*2, canvas.height());
        //Horizontal lines
        ctx.moveTo(0, space_width);
        ctx.lineTo(canvas.width(), space_width);
        ctx.moveTo(0, space_width*2);
        ctx.lineTo(canvas.width(), space_width*2);
        ctx.stroke();
        ctx.closePath();
    };
    this.draw_background();

    /**
    * Return true if current position is the same as n-back trial position
    */
    this.is_pos_thesame = function(){
        var compare_trial = this.current_trial - this.count_nback; //Index of previous trial to compare
        if (compare_trial >= 0){
            var current_value = this.arr_pos[this.current_trial];
            var prev_value = this.arr_pos[compare_trial];
            if (current_value == prev_value){
                return true;
            }
        };
        return false;
    };

    /**
    * Return true if current letter is the same as n-back trial letter
    */
    this.is_letter_thesame = function(){
        var compare_trial = this.current_trial - this.count_nback; //Index of previous trial to compare
        if (compare_trial >= 0){
            var current_value = this.arr_letter[this.current_trial];
            var prev_value = this.arr_letter[compare_trial];
            if (current_value == prev_value){
                return true;
            }
        };
        return false;
    };

    /**
    * Reset indicator color
    */
    this.reset_color = function(){
        $("#pressA").css('color','black');
        $("#pressL").css('color','black');
        this.pressed_a = false;
        this.pressed_l = false;
    }
}

/**
* Return random integer number in [m,n], including m and n
*/
function random_int(m, n){
    return Math.floor(m + (1+n-m)*Math.random());  // num is random integer from m to n
}

function getQueryVariable(variable)
{
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i=0;i<vars.length;i++) {
            var pair = vars[i].split("=");
            if(pair[0] == variable){return pair[1];}
    }
    return(false);
}

var nb;

$(function(){
    nb = new nback();
    //nb.start_game();
    //nb.draw_background();
    //nb.draw_square(8);
    //nb.play_sound('t');
    //setTimeout('nb.hide_square(8)',1000);

    $(document).keydown(function(e){
        if (e.which == 32){
            //Spacebar
            if (nb.current_trial < 0){
                nb.start_game();
            }
        }
        if (nb.answer_allowed && (e.which == 65 || e.which == 76)) {
          console.log(nb.get_timedelta());
          if (nb.answer_allowed && e.which == 65){
              if (!nb.pressed_a){
                  //A key
                  if (nb.is_pos_thesame()){
                      if (nb.show_indicator) $("#pressA").css('color','green');
                  }
                  else
                      {
                      if (nb.show_indicator) $("#pressA").css('color','red');
                  }
                  nb.pressed_a = true;
              }
          }
          if (nb.answer_allowed && e.which == 76){
              if (!nb.pressed_l){
                  //L key
                  if (nb.is_letter_thesame()){
                      if (nb.show_indicator) $("#pressL").css('color','green');
                  }
                  else
                      {
                      if (nb.show_indicator) $("#pressL").css('color','red');
                  }
                  nb.pressed_l = true;
              }
          }
        }
    });
});
