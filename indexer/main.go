package main

import (
	"log"

	"github.com/1gazzar1/gazoogle/indexer/util"
	_ "github.com/jackc/pgx/v5"
)

func main() {
	_, output, err := util.BuildPageWithWeightTF(`<!DOCTYPE html>
<html>
<head>
<title>ULTRAKILL is a great game</title>
</head>
<body>

<h1>My First     Heading</h1>
<h2>My 4th Heading</h2>
<h1>My 2nd   Heading</h1>
<h1>My 3rd   Heading</h1>
<h1>My    67th   H  eading</h1>
<p>My first paragraph, how are we doing right now ? </p>
<p>I'm Going TO ULTRAKILL YOU</p>
<p>ULTRAKILL YOURSELF</p>

</body>
</html>

`)
	if err != nil {
		log.Fatal("error :<", err)
	}
	log.Println(output, len(output))
}
