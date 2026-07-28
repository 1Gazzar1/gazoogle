package main

import (
	"log"

	"github.com/1gazzar1/gazoogle/indexer/util"
	_ "github.com/jackc/pgx/v5"
)

func main() {
	output, err := util.ExtractAllTextFromTag(`<!DOCTYPE html>
<html>
<head>
<title>Page Title</title>
</head>
<body>

<h1>My First     Heading</h1>
<h2>My 4th Heading</h2>
<h1>My 2nd   Heading</h1>
<h1>My 3rd   Heading</h1>
<h1>My    67th   H  eading</h1>
<p>My first paragraph.</p>

</body>
</html>

`, "h1")
	if err != nil {
		log.Fatal("error :<", err)
	}
	log.Println(output, len(output))
}
