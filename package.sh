echo "Packaging the application from build/"
7z a -tzip package.zip ./build/*
echo "Done. Package is in package.zip and is ready to publish!"