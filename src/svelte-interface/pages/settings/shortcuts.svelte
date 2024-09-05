<script lang="ts">
    function formatUrl(inputUrl: string) {
        const protocolRegex = /^(http:\/\/|https:\/\/|ftp:\/\/)/;
        return protocolRegex.test(inputUrl) ? inputUrl : `https://${inputUrl}`;
    }
</script>

<div class="text-xl">shortcuts tab</div>