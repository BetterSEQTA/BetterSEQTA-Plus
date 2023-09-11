echo "Packaging the application from build/"
7z a -tzip package.zip ./build/*
echo "Done. Package is in package.zip and is ready to publish!"

# Updating safari Xcode Project
echo "Packaging for Safari"
cp ./build/* "./safari/Shared (Extension)\Resources"