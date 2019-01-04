# Stock-Trading-System
## Basic Information
This is parts of a stock trading system, including two components. The first component is a central processor, which processes instructions from the client, such as sell, buy, check balance, etc. The second component is the display center, which shows the result of trading and the history of instructions.

The architecture of the whole trading system is shown in the following picture.
![alt image](https://raw.githubusercontent.com/yangjufo/Stock-Trading-System/master/readme/system_design.PNG)
The architecture of 
![alt image](https://raw.githubusercontent.com/yangjufo/Stock-Trading-System/master/readme/component_design.PNG)

The central processor is responsible for:
>1. Receive and check the instructions from the client
>2. Check the stock balance and money balance
>3. Calculate the instruction with certain rules
>4. Return the processing results
>5. Provide interfaces for query

## Tools
The project is developed with Node.js.

## Demo
Because running of the whole system needs three other components, we are not able to provide an online demo.

### Video Demo
You can find a video for the front end on Youtube.
[![image video](https://raw.githubusercontent.com/yangjufo/Stock-Trading-System/master/readme/demo_capture.png)](https://www.youtube.com/watch?v=RaDV6J1n9m8)
